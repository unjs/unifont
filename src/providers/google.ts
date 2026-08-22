import type { FontFaceData, FontFormat, FontStyles, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { fetchWithRetries } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights, splitCssIntoSubsets } from '../utils'

type VariableAxis = 'opsz' | 'slnt' | 'wdth' | (string & {})

export interface GoogleProviderOptions {
  experimental?: {
    /**
     * Experimental: Setting variable axis configuration on a per-font basis.
     */
    variableAxis?: {
      [fontFamily: string]: Partial<Record<VariableAxis, ([string, string] | string)[]>>
    }
    /**
     * Experimental: Specifying a list of glyphs to be included in the font for each font family.
     * This can reduce the size of the font file.
     */
    glyphs?: {
      [fontFamily: string]: string[]
    }
  }
}

export interface GoogleFamilyOptions {
  experimental?: {
    /**
     * Experimental: Setting variable axis configuration on a per-font basis.
     */
    variableAxis?: Partial<Record<VariableAxis, ([string, string] | string)[]>>
    /**
     * Experimental: Specifying a list of glyphs to be included in the font for each font family.
     * This can reduce the size of the font file.
     */
    glyphs?: string[]
  }
}

// https://stackoverflow.com/questions/25011533/google-font-api-uses-browser-detection-how-to-get-all-font-variations-for-font
export const userAgents: Partial<Record<FontFormat, string>> = {
  eot: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
  ttf: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
  woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
}

// There are others like display and handwriting but these are not valid
const VALID_FALLBACKS: Record<string, string> = {
  'Sans Serif': 'sans-serif',
  'Serif': 'serif',
  'Monospace': 'monospace',
}

function getFallbacks(category: string): string[] | undefined {
  const fallback = VALID_FALLBACKS[category]
  if (fallback)
    return [fallback]
  return undefined
}

export default defineFontProvider('google', async (providerOptions: GoogleProviderOptions, ctx) => {
  const { familyMetadataList: googleFonts } = await ctx.storage.getItem('google:meta.json', () => fetchWithRetries('https://fonts.google.com/metadata/fonts').then(res => res.json() as Promise<{ familyMetadataList: FontIndexMeta[] }>))

  const styleMap = {
    italic: '1',
    oblique: '1',
    normal: '0',
  }

  async function getFontDetails(font: FontIndexMeta, options: ResolveFontOptions<GoogleFamilyOptions>) {
    const styles = [...new Set(options.styles.map(i => styleMap[i]))].sort()
    const glyphs = (options.options?.experimental?.glyphs ?? providerOptions.experimental?.glyphs?.[font.family])?.join('')
    // The `css2` endpoint instances the font down to the axes named in the request:
    // any axis we omit is stripped from the delivered file, and any value outside a
    // family's real axis range is a hard 400 rather than a partial result. So every
    // requested axis value is clamped against the axis metadata before we build the URL.
    const fontAxes = new Map(font.axes.map(axis => [axis.tag, axis]))
    const weightAxis = fontAxes.get('wght')

    const weights = dedupeBy(prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: !!weightAxis,
      weights: Object.keys(font.fonts),
    }).flatMap((v) => {
      if (!v.variable)
        return v
      const [min, max] = v.weight.split(' ') as [string, string]
      const clamped = clampAxisValue([min, max], weightAxis!)
      if (!clamped)
        return []
      return { weight: clamped, variable: clamped.includes('..') }
    }), v => v.weight)

    if (weights.length === 0 || styles.length === 0)
      return []

    const variableAxis = options.options?.experimental?.variableAxis ?? providerOptions.experimental?.variableAxis?.[font.family]
    const resolvedVariableAxes: Record<string, string[]> = {}
    for (const [tag, values] of Object.entries(variableAxis ?? {})) {
      const axis = fontAxes.get(tag)
      if (!axis || !values)
        continue
      const resolved = [...new Set(values.flatMap(value => clampAxisValue(value, axis) ?? []))]
      if (resolved.length > 0) {
        resolvedVariableAxes[tag] = resolved
      }
    }

    const resolvedAxes = []
    let resolvedVariants: string[] = []
    const candidateAxes = [
      'wght',
      'ital',
      ...Object.keys(resolvedVariableAxes),
    ].sort(googleFlavoredSorting)

    for (const axis of candidateAxes) {
      const axisValue = ({
        wght: weights.map(v => v.weight),
        ital: styles,
      })[axis] ?? resolvedVariableAxes[axis]!

      if (resolvedVariants.length === 0) {
        resolvedVariants = axisValue
      }
      else {
        resolvedVariants = resolvedVariants.flatMap(v => Array.from(axisValue, o => [v, o].join(','))).sort()
      }
      resolvedAxes.push(axis)
    }

    let priority = 0
    const resolvedFontFaceData: FontFaceData[] = []

    for (const format of options.formats) {
      const userAgent = userAgents[format]
      if (!userAgent)
        continue

      let url = `https://fonts.googleapis.com/css2?family=${font.family}:${resolvedAxes.join(',')}@${resolvedVariants.join(';')}`
      if (glyphs) {
        url += `&text=${encodeURIComponent(glyphs)}`
      }
      const rawCss = await fetchWithRetries(url, {
        headers: {
          'user-agent': userAgent,
        },
      }).then(res => res.text())
      const groups = splitCssIntoSubsets(rawCss).filter(group => group.subset ? options.subsets.includes(group.subset) : true)
      for (const group of groups) {
        const data = extractFontFaceData(group.css)
        data.map((f) => {
          // avoid accidental pinning to a single width
          if (!resolvedVariableAxes.wdth && f.stretch && !f.stretch.includes(' ')) {
            delete f.stretch
          }
          f.meta ??= {}
          f.meta.priority = priority
          if (group.subset) {
            f.meta.subset = group.subset
          }
          return f
        })
        resolvedFontFaceData.push(...data)
      }
      priority++
    }

    return cleanFontFaces(resolvedFontFaceData, options.formats)
  }

  return {
    listFonts() {
      return googleFonts.map(font => font.family)
    },
    getFontProperties(fontFamily) {
      const font = googleFonts.find(font => font.family === fontFamily)
      if (!font)
        return
      const styles = new Set<FontStyles>(['normal'])
      const weights = new Set<string>()
      for (const rawWeight of Object.keys(font.fonts)) {
        const italic = rawWeight.endsWith('i')
        const weight = italic ? rawWeight.slice(0, -1) : rawWeight
        if (italic)
          styles.add('italic')
        weights.add(weight)
      }
      const axis = font.axes.find(a => a.tag === 'wght')
      if (axis) {
        weights.add(`${axis.min} ${axis.max}`)
      }
      return {
        formats: ['woff2', 'woff', 'ttf', 'eot'],
        styles: [...styles],
        subsets: font.subsets,
        weights: [...weights],
      }
    },
    async resolveFont(fontFamily, options: ResolveFontOptions<GoogleFamilyOptions>) {
      const font = googleFonts.find(font => font.family === fontFamily)
      if (!font) {
        return
      }

      return {
        fonts: await ctx.storage.getItem(`google:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(font, options)),
        fallbacks: getFallbacks(font.category),
      }
    },
  }
})

/** internal */

interface FontAxis {
  tag: 'wght' | 'opsz' | 'slnt' | 'wdth' | (string & {})
  min: number
  max: number
  defaultValue: number
}

function clampAxisValue(value: string | [string, string], axis: FontAxis): string | undefined {
  if (!Array.isArray(value)) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed))
      return undefined
    return String(clamp(parsed, axis))
  }

  const min = Number(value[0])
  const max = Number(value[1])
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max)
    return undefined

  // The requested range does not overlap the axis at all
  if (max < axis.min || min > axis.max)
    return undefined

  const clampedMin = clamp(min, axis)
  const clampedMax = clamp(max, axis)

  return clampedMin === clampedMax ? String(clampedMin) : `${clampedMin}..${clampedMax}`
}

function clamp(value: number, axis: FontAxis) {
  return Math.min(Math.max(value, axis.min), axis.max)
}

function dedupeBy<T>(items: T[], by: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = by(item)
    return !seen.has(key) && !!seen.add(key)
  })
}

interface FontIndexMeta {
  family: string
  subsets: string[]
  category: string
  fonts: Record<string, {
    thickness: number | null
    slant: number | null
    width: number | null
    lineHeight: number | null
  }>
  axes: FontAxis[]
}

// Google wants lowercase letters to be in front of uppercase letters.
function googleFlavoredSorting(a: string, b: string) {
  const isALowercase = a.charAt(0) === a.charAt(0).toLowerCase()
  const isBLowercase = b.charAt(0) === b.charAt(0).toLowerCase()

  if (isALowercase !== isBLowercase) {
    return Number(isBLowercase) - Number(isALowercase)
  }
  else {
    return a.localeCompare(b)
  }
}
