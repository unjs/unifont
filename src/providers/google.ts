import type { FontAxis, FontFaceData, FontFormat, FontStyles, NormalizedVariableAxis, ProviderResolveFontOptions, VariableAxis, VariableAxisValue } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { cleanFontFaces, defineFontProvider, normalizeVariableAxis, prepareWeights, splitCssIntoSubsets } from '../utils'

export interface GoogleProviderOptions {
  experimental?: {
    /**
     * Experimental: Setting variable axis configuration on a per-font basis.
     */
    variableAxis?: {
      [fontFamily: string]: Partial<Record<VariableAxis, VariableAxisValue[]>>
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
    variableAxis?: Partial<Record<VariableAxis, VariableAxisValue[]>>
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

/** Recovers the format a request is asking Google for, for callers that cannot set `user-agent`. */
export function formatFromUserAgent(userAgent: string | null): FontFormat | undefined {
  return (Object.keys(userAgents) as FontFormat[]).find(format => userAgents[format] === userAgent)
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
  const { familyMetadataList: googleFonts } = await ctx.storage.getItem('google:meta.json', () => ctx.fetch('https://fonts.google.com/metadata/fonts').then(res => res.json() as Promise<{ familyMetadataList: FontIndexMeta[] }>))

  const styleMap = {
    italic: '1',
    oblique: '1',
    normal: '0',
  }

  /** Resolves the axis values `css2` can be asked for, dropping axes the family does not publish. */
  function getInstancedAxes(font: FontIndexMeta, options: ProviderResolveFontOptions<GoogleFamilyOptions>) {
    const variableAxis = normalizeVariableAxis(options.options?.experimental?.variableAxis ?? providerOptions.experimental?.variableAxis?.[font.family] ?? options.variableAxis)
    const fontAxes = new Map(font.axes.map(axis => [axis.tag, axis]))
    const instanced: Record<string, string[]> = {}

    for (const [tag, values] of Object.entries(variableAxis ?? {})) {
      // `wght` and `ital` are requested from the `weights` and `styles` options
      if (tag === 'wght' || tag === 'ital')
        continue
      const axis = fontAxes.get(tag)
      if (!axis || !values)
        continue
      const resolved = [...new Set(values.flatMap(value => clampAxisValue(value, axis) ?? []))]
      if (resolved.length > 0) {
        instanced[tag] = resolved
      }
    }

    return { variableAxis, instanced }
  }

  async function getFontDetails(font: FontIndexMeta, options: ProviderResolveFontOptions<GoogleFamilyOptions>) {
    // A family that publishes no italic (or no upright) answers 400 for the axis value it
    // does not have, so requested styles are narrowed to the ones the metadata lists.
    const availableStyles = getAvailableStyles(font)
    const styles = [...new Set(options.styles.filter(i => availableStyles.has(i)).map(i => styleMap[i]))].sort()
    // Subsets are filtered out of the response anyway, so a request that asks only for subsets
    // the family does not publish can be answered without a fetch.
    const hasRequestedSubset = options.subsets.length === 0 || !font.subsets?.length || options.subsets.some(subset => font.subsets.includes(subset))
    const glyphs = (options.options?.experimental?.glyphs ?? providerOptions.experimental?.glyphs?.[font.family])?.join('')
    // The `css2` endpoint instances the font down to the axes named in the request:
    // any axis we omit is stripped from the delivered file, and any value outside a
    // family's real axis range is a hard 400 rather than a partial result. So every
    // requested axis value is clamped against the axis metadata before we build the URL.
    const fontAxes = new Map(font.axes.map(axis => [axis.tag, axis]))
    const weightAxis = fontAxes.get('wght')

    const allWeights = dedupeBy(prepareWeights({
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

    // A variable range already delivers every weight it spans, so requesting those weights as
    // separate static files as well would ship the same glyphs twice.
    const ranges = allWeights.filter(v => v.variable).map(v => v.weight.split('..').map(Number) as [number, number])
    const weights = allWeights.filter(v => v.variable || !ranges.some(([min, max]) => Number(v.weight) >= min && Number(v.weight) <= max))

    if (weights.length === 0 || styles.length === 0 || !hasRequestedSubset)
      return []

    const { instanced: resolvedVariableAxes } = getInstancedAxes(font, options)

    const candidateAxes = [
      'wght',
      'ital',
      ...Object.keys(resolvedVariableAxes),
    ].sort(googleFlavoredSorting)

    function buildRequest(weightValues: string[]) {
      const resolvedAxes: string[] = []
      let resolvedVariants: string[] = []
      for (const axis of candidateAxes) {
        const axisValue = ({
          wght: weightValues,
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
      return `${font.family}:${resolvedAxes.join(',')}@${resolvedVariants.join(';')}`
    }

    // `css2` rejects a request that mixes an axis range with discrete values on the same axis,
    // so ranges and static weights are requested separately and merged.
    const requests = [
      weights.filter(v => v.variable),
      weights.filter(v => !v.variable),
    ].filter(group => group.length > 0).map(group => buildRequest(group.map(v => v.weight)))

    let priority = 0
    const resolvedFontFaceData: FontFaceData[] = []

    for (const format of options.formats) {
      const userAgent = userAgents[format]
      if (!userAgent)
        continue

      for (const request of requests) {
        const baseUrl = `https://fonts.googleapis.com/css2?family=${request}`
        const fetchFaces = async (url: string) => {
          const rawCss = await ctx.fetch(url, {
            headers: {
              'user-agent': userAgent,
            },
          }).then(res => res.text())
          return splitCssIntoSubsets(rawCss)
            .filter(group => group.subset ? options.subsets.includes(group.subset) : true)
            .flatMap(group => extractFontFaceData(group.css).map(face => ({ face, subset: group.subset })))
        }

        const faces = glyphs
          ? await resolveGlyphFaces(glyphs, baseUrl, fetchFaces)
          : await fetchFaces(baseUrl)

        for (const { face, subset } of faces) {
          // avoid accidental pinning to a single width
          if (!resolvedVariableAxes.wdth && face.stretch && !face.stretch.includes(' ')) {
            delete face.stretch
          }
          face.meta ??= {}
          face.meta.priority = priority
          if (subset) {
            face.meta.subset = subset
          }
          resolvedFontFaceData.push(face)
        }
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
        axes: font.axes.map(axis => ({ tag: axis.tag, min: axis.min, max: axis.max, defaultValue: axis.defaultValue })),
        formats: ['woff2', 'woff', 'ttf', 'eot'],
        styles: [...styles],
        subsets: font.subsets,
        weights: [...weights],
      }
    },
    async resolveFont(fontFamily, options: ProviderResolveFontOptions<GoogleFamilyOptions>) {
      const font = googleFonts.find(font => font.family === fontFamily)
      if (!font) {
        return
      }

      // Derived outside the cached call, which stores font face data only.
      const { variableAxis, instanced } = getInstancedAxes(font, options)

      return {
        fonts: await ctx.storage.getItem(`google:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(font, options)),
        fallbacks: getFallbacks(font.category),
        ...(variableAxis ? { appliedVariableAxis: toNormalizedValues(instanced) } : {}),
      }
    },
  }
})

/** internal */

interface SubsetFace {
  face: FontFaceData
  subset: string | null
}

/** Serves curated faces the glyphs cover in full, and builds the rest with `text=`. */
async function resolveGlyphFaces(glyphs: string, baseUrl: string, fetchFaces: (url: string) => Promise<SubsetFace[]>): Promise<SubsetFace[]> {
  const codepoints = new Set([...glyphs].map(glyph => glyph.codePointAt(0)!))
  const covered: SubsetFace[] = []
  const coveredRanges: [number, number][] = []

  for (const entry of await fetchFaces(baseUrl)) {
    const ranges = entry.face.unicodeRange?.map(parseUnicodeRange)
    if (!ranges?.every(range => !!range && isRangeCovered(range, codepoints)))
      continue
    covered.push(entry)
    coveredRanges.push(...ranges.filter(range => !!range))
  }

  const remainder = [...codepoints].filter(codepoint => !coveredRanges.some(([start, end]) => codepoint >= start && codepoint <= end))
  if (remainder.length === 0)
    return covered

  return [...covered, ...await fetchFaces(`${baseUrl}&text=${encodeURIComponent(String.fromCodePoint(...remainder))}`)]
}

function isRangeCovered([start, end]: [number, number], codepoints: Set<number>) {
  if (end - start >= codepoints.size)
    return false
  for (let codepoint = start; codepoint <= end; codepoint++) {
    if (!codepoints.has(codepoint))
      return false
  }
  return true
}

const UNICODE_RANGE_RE = /^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/

function parseUnicodeRange(value: string): [number, number] | undefined {
  const match = value.trim().toLowerCase().match(UNICODE_RANGE_RE)
  if (!match)
    return undefined
  const [, start, end] = match as unknown as [string, string, string | undefined]
  return [
    Number.parseInt(start.replaceAll('?', '0'), 16),
    end === undefined ? Number.parseInt(start.replaceAll('?', 'f'), 16) : Number.parseInt(end, 16),
  ]
}

/** Expresses the values requested from `css2` (`62.5..100`) in the shape unifont reports. */
function toNormalizedValues(instanced: Record<string, string[]>): NormalizedVariableAxis {
  const normalized: NormalizedVariableAxis = {}
  for (const [tag, values] of Object.entries(instanced)) {
    normalized[tag] = values.map((value) => {
      const [min, max] = value.split('..')
      return max === undefined ? min! : [min!, max]
    })
  }
  return normalized
}

function clampAxisValue(value: string | [string, string], axis: FontAxis): string | undefined {
  if (!Array.isArray(value)) {
    return String(clamp(Number(value), axis))
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

function getAvailableStyles(font: FontIndexMeta): Set<FontStyles> {
  const styles = new Set<FontStyles>()
  for (const weight of Object.keys(font.fonts)) {
    if (weight.endsWith('i')) {
      styles.add('italic')
      styles.add('oblique')
    }
    else {
      styles.add('normal')
    }
  }
  if (font.axes.some(axis => axis.tag === 'ital' || axis.tag === 'slnt')) {
    styles.add('italic')
    styles.add('oblique')
  }
  return styles
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
