import { hash } from 'ohash'

import { $fetch } from '../fetch'
import { defineFontProvider, type FontFaceData, type ResolveFontFacesOptions } from '../types'

const fontAPI = $fetch.create({ baseURL: 'https://api.fontsource.org/v1' })

export default defineFontProvider('fontsource', async (_options, ctx) => {
  const fonts = await ctx.storage.getItem('fontsource:meta.json', () => fontAPI<FontsourceFontMeta[]>('/fonts', { responseType: 'json' }))
  const familyMap = new Map<string, FontsourceFontMeta>()

  for (const meta of fonts) {
    familyMap.set(meta.family, meta)
  }

  async function getFontDetails(family: string, options: ResolveFontFacesOptions) {
    const font = familyMap.get(family)!
    const weights = options.weights.filter(weight => font.weights.includes(Number(weight)))
    const styles = options.styles.filter(style => font.styles.includes(style))
    const subsets = options.subsets ? options.subsets.filter(subset => font.subsets.includes(subset)) : [font.defSubset]
    if (weights.length === 0 || styles.length === 0)
      return []

    const fontDetail = await fontAPI<FontsourceFontDetail>(`/fonts/${font.id}`, { responseType: 'json' })
    const fontFaceData: FontFaceData[] = []

    for (const subset of subsets) {
      for (const style of styles) {
        if (font.variable) {
          try {
            const variableAxes = await ctx.storage.getItem(`fontsource:${font.family}-axes.json`, () => fontAPI<FontsourceVariableFontDetail>(`/variable/${font.id}`, { responseType: 'json' }))
            if (variableAxes && variableAxes.axes.wght) {
              fontFaceData.push({
                style,
                weight: [Number(variableAxes.axes.wght.min), Number(variableAxes.axes.wght.max)],
                src: [
                  { url: `https://cdn.jsdelivr.net/fontsource/fonts/${font.id}:vf@latest/${subset}-wght-${style}.woff2`, format: 'woff2' },
                ],
                unicodeRange: fontDetail.unicodeRange[subset]?.split(','),
              })
            }
          }
          catch {
            console.error(`Could not download variable axes metadata for \`${font.family}\` from \`fontsource\`. \`unifont\` will not be able to inject variable axes for ${font.family}.`)
          }
        }
        for (const weight of weights) {
          const variantUrl = fontDetail.variants[weight]![style]![subset]!.url
          fontFaceData.push({
            style,
            weight,
            src: Object.entries(variantUrl).map(([format, url]) => ({ url, format })),
            unicodeRange: fontDetail.unicodeRange[subset]?.split(','),
          })
        }
      }
    }

    return fontFaceData
  }

  return {
    async resolveFontFaces(fontFamily, options) {
      if (!familyMap.has(fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`fontsource:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(fontFamily, options))
      return { fonts }
    },
  }
})

interface FontsourceFontMeta {
  id: string
  family: string
  subsets: string[]
  weights: number[]
  styles: string[]
  defSubset: string
  variable: boolean
  lastModified: string
  category: string
  version: string
  type: string
}

interface FontsourceFontFile {
  url: {
    woff2?: string
    woff?: string
    ttf?: string
  }
}

interface FontsourceFontVariant {
  [key: string]: {
    [key: string]: {
      [key: string]: FontsourceFontFile
    }
  }
}

interface FontsourceFontDetail {
  id: string
  family: string
  subsets: string[]
  weights: number[]
  styles: string[]
  unicodeRange: Record<string, string>
  defSubset: string
  variable: boolean
  lastModified: string
  category: string
  version: string
  type: string
  variants: FontsourceFontVariant
}

interface FontsourceVariableAxesData {
  default: string
  min: string
  max: string
  step: string
}

interface FontsourceVariableFontDetail {
  axes: Record<string, FontsourceVariableAxesData>
  family: string
}
