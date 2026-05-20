import type { FontFaceData, FontStyles, ProviderContext, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights } from '../utils'

const fontAPI = $fetch.create({ baseURL: 'https://api.fontsource.org/v1' })

// registered OpenType axes served via the fontsource `standard` variant
const FONTSOURCE_REGISTERED_AXES = new Set(['wght', 'ital', 'slnt', 'wdth', 'opsz'])

function pickFontsourceAxisSlug(axes: string[]): 'wght' | 'standard' | 'full' {
  let hasRegisteredExtra = false
  for (const axis of axes) {
    if (axis === 'wght' || axis === 'ital')
      continue
    if (!FONTSOURCE_REGISTERED_AXES.has(axis))
      return 'full'
    hasRegisteredExtra = true
  }
  return hasRegisteredExtra ? 'standard' : 'wght'
}

async function getVariableAxes(ctx: ProviderContext, font: FontsourceFontMeta) {
  return await ctx.storage.getItem(`fontsource:${font.family}-axes.json`, () => fontAPI<FontsourceVariableFontDetail>(`/variable/${font.id}`, { responseType: 'json' }))
}

export default defineFontProvider('fontsource', async (_options, ctx) => {
  const fonts = await ctx.storage.getItem('fontsource:meta.json', () => fontAPI<FontsourceFontMeta[]>('/fonts', { responseType: 'json' }))
  const familyMap = new Map<string, FontsourceFontMeta>()

  for (const meta of fonts) {
    familyMap.set(meta.family, meta)
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    const font = familyMap.get(family)!
    const weights = prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: font.variable,
      weights: font.weights.map(String),
    })
    const styles = options.styles.filter(style => font.styles.includes(style))
    const subsets = options.subsets ? options.subsets.filter(subset => font.subsets.includes(subset)) : [font.defSubset]
    if (weights.length === 0 || styles.length === 0)
      return []

    const fontDetail = await fontAPI<FontsourceFontDetail>(`/fonts/${font.id}`, { responseType: 'json' })
    const fontFaceData: FontFaceData[] = []

    for (const subset of subsets) {
      for (const style of styles) {
        for (const { weight, variable } of weights) {
          if (variable) {
            try {
              const variableAxes = await getVariableAxes(ctx, font)
              if (variableAxes.axes.wght) {
                const axisSlug = pickFontsourceAxisSlug(Object.keys(variableAxes.axes))
                fontFaceData.push({
                  style,
                  weight: [Number(variableAxes.axes.wght.min), Number(variableAxes.axes.wght.max)],
                  src: [
                    { url: `https://cdn.jsdelivr.net/fontsource/fonts/${font.id}:vf@latest/${subset}-${axisSlug}-${style}.woff2`, format: 'woff2' },
                  ],
                  unicodeRange: fontDetail.unicodeRange[subset]?.split(','),
                  meta: { subset },
                })
              }
            }
            catch {
              console.error(`Could not download variable axes metadata for \`${font.family}\` from \`fontsource\`. \`unifont\` will not be able to inject variable axes for ${font.family}.`)
            }
            continue
          }

          const variantUrl = fontDetail.variants[weight]![style]![subset]!.url
          fontFaceData.push({
            style,
            weight,
            src: Object.entries(variantUrl).map(([format, url]) => ({ url, format })),
            unicodeRange: fontDetail.unicodeRange[subset]?.split(','),
            meta: { subset },
          })
        }
      }
    }

    return cleanFontFaces(fontFaceData, options.formats)
  }

  return {
    listFonts() {
      return [...familyMap.keys()]
    },
    async getAvailableFontProperties(fontFamily) {
      const font = familyMap.get(fontFamily)
      if (!font)
        return
      const weights = [...font.weights.map(String)]
      if (font.variable) {
        const variableAxes = await getVariableAxes(ctx, font).catch(() => undefined)
        if (variableAxes?.axes.wght)
          weights.push(`${variableAxes.axes.wght.min} ${variableAxes.axes.wght.max}`)
      }
      return {
        formats: ['woff2', 'woff', 'ttf'],
        styles: font.styles,
        subsets: font.subsets,
        weights,
      }
    },
    async resolveFont(fontFamily, options) {
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
  styles: FontStyles[]
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
