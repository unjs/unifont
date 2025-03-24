import type { ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider } from '../utils'

type VariableAxis = 'opsz' | 'slnt' | 'wdth' | (string & {})

interface ProviderOption {
  experimental?: {
    /**
     * Experimental: Setting variable axis configuration on a per-font basis.
     */
    variableAxis?: {
      [key: string]: Partial<Record<VariableAxis, ([string, string] | string)[] >>
    }
  }
}

export default defineFontProvider<ProviderOption>('google', async (_options = {}, ctx) => {
  const googleFonts = await ctx.storage.getItem('google:meta.json', () => $fetch<{ familyMetadataList: FontIndexMeta[] }>('https://fonts.google.com/metadata/fonts', { responseType: 'json' }).then(r => r.familyMetadataList))

  const styleMap = {
    italic: '1',
    oblique: '1',
    normal: '0',
  }

  const userAgents = {
    woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ttf: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16',
  // eot: 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
  // woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  // svg: 'Mozilla/4.0 (iPad; CPU OS 4_0_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/4.1 Mobile/9A405 Safari/7534.48.3',
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    const font = googleFonts.find(font => font.family === family)!
    const styles = [...new Set(options.styles.map(i => styleMap[i]))].sort()
    const glyphs = options.glyphs?.join('')

    const variableWeight = font.axes.find(a => a.tag === 'wght')
    const weights = variableWeight
      ? [`${variableWeight.min}..${variableWeight.max}`]
      : options.weights.filter(weight => weight in font.fonts)

    if (weights.length === 0 || styles.length === 0)
      return []

    const resolvedAxes = []
    let resolvedVariants: string[] = []

    for (const axis of ['wght', 'ital', ...Object.keys(_options?.experimental?.variableAxis?.[family] ?? {})].sort(googleFlavoredSorting)) {
      const axisValue = ({
        wght: weights,
        ital: styles,
      })[axis] ?? _options!.experimental!.variableAxis![family]![axis]!.map(v => Array.isArray(v) ? `${v[0]}..${v[1]}` : v)

      if (resolvedVariants.length === 0) {
        resolvedVariants = axisValue
      }
      else {
        resolvedVariants = resolvedVariants.flatMap(v => [...axisValue].map(o => [v, o].join(','))).sort()
      }
      resolvedAxes.push(axis)
    }

    let css = ''

    for (const extension in userAgents) {
      css += await $fetch<string>('/css2', {
        baseURL: 'https://fonts.googleapis.com',
        headers: { 'user-agent': userAgents[extension as keyof typeof userAgents] },
        query: {
          family: `${family}:${resolvedAxes.join(',')}@${resolvedVariants.join(';')}`,
          ...(glyphs && { text: glyphs }),
        },
      })
    }

    // TODO: support subsets
    return extractFontFaceData(css)
  }

  return {
    async resolveFont(fontFamily, options) {
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
