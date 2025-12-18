import type { FontFaceData, FontFormat, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights, splitCssIntoSubsets } from '../utils'

type VariableAxis = 'opsz' | 'slnt' | 'wdth' | (string & {})

export interface GoogleOptions {
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
  woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  ttf: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
  eot: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
}

export default defineFontProvider('google', async (providerOptions: GoogleOptions, ctx) => {
  const googleFonts = await ctx.storage.getItem('google:meta.json', () => $fetch<{ familyMetadataList: FontIndexMeta[] }>('https://fonts.google.com/metadata/fonts', { responseType: 'json' }).then(r => r.familyMetadataList))

  const styleMap = {
    italic: '1',
    oblique: '1',
    normal: '0',
  }

  async function getFontDetails(family: string, options: ResolveFontOptions<GoogleFamilyOptions>) {
    const font = googleFonts.find(font => font.family === family)!
    const styles = [...new Set(options.styles.map(i => styleMap[i]))].sort()
    const glyphs = (options.options?.experimental?.glyphs ?? providerOptions.experimental?.glyphs?.[family])?.join('')
    const weights = prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: font.axes.some(a => a.tag === 'wght'),
      weights: Object.keys(font.fonts),
    }).map(v => v.variable
      ? ({
          weight: v.weight.replace(' ', '..'),
          variable: v.variable,
        })
      : v)

    if (weights.length === 0 || styles.length === 0)
      return []

    const resolvedAxes = []
    let resolvedVariants: string[] = []
    const variableAxis = options.options?.experimental?.variableAxis ?? providerOptions.experimental?.variableAxis?.[family]
    const candidateAxes = [
      'wght',
      'ital',
      ...Object.keys(variableAxis ?? {}),
    ].sort(googleFlavoredSorting)

    for (const axis of candidateAxes) {
      const axisValue = ({
        wght: weights.map(v => v.weight),
        ital: styles,
      })[axis] ?? variableAxis![axis]!.map(v => Array.isArray(v) ? `${v[0]}..${v[1]}` : v)

      if (resolvedVariants.length === 0) {
        resolvedVariants = axisValue
      }
      else {
        resolvedVariants = resolvedVariants.flatMap(v => [...axisValue].map(o => [v, o].join(','))).sort()
      }
      resolvedAxes.push(axis)
    }

    let priority = 0
    const resolvedFontFaceData: FontFaceData[] = []

    for (const format of options.formats) {
      const userAgent = userAgents[format]
      if (!userAgent)
        continue

      const rawCss = await $fetch<string>('/css2', {
        baseURL: 'https://fonts.googleapis.com',
        headers: {
          'user-agent': userAgent,
        },
        query: {
          family: `${family}:${resolvedAxes.join(',')}@${resolvedVariants.join(
            ';',
          )}`,
          ...(glyphs && { text: glyphs }),
        },
      })
      const groups = splitCssIntoSubsets(rawCss).filter(group => group.subset ? options.subsets.includes(group.subset) : true)
      for (const group of groups) {
        const data = extractFontFaceData(group.css)
        data.map((f) => {
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
    async resolveFont(fontFamily, options: ResolveFontOptions<GoogleFamilyOptions>) {
      if (!googleFonts.some(font => font.family === fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`google:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(fontFamily, options))
      return { fonts }
    },
  }
})

/** internal */

interface FontIndexMeta {
  family: string
  subsets: string[]
  fonts: Record<string, {
    thickness: number | null
    slant: number | null
    width: number | null
    lineHeight: number | null
  }>
  axes: Array<{
    tag: string
    min: number
    max: number
    defaultValue: number
  }>
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
