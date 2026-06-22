import type { FontFaceData, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { fetchWithRetries } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights } from '../utils'

const BASE_URL = 'https://api.fontsource.org/v1'

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

// There are others like display and handwriting but these are not valid
const VALID_FALLBACKS = ['sans-serif', 'serif', 'monospace']

function getFallbacks(category: string): string[] | undefined {
  if (VALID_FALLBACKS.includes(category))
    return [category]
  return undefined
}

export default defineFontProvider('fontsource', async (_options, ctx) => {
  const fonts = await ctx.storage.getItem('fontsource:meta.json', () => fetchWithRetries(`${BASE_URL}/fonts`).then(res => res.json() as Promise<FontsourceFontMeta[]>))
  const familyMap = new Map<string, FontsourceFontMeta>()

  for (const meta of fonts) {
    familyMap.set(meta.family, meta)
  }

  async function getFontDetails(font: FontsourceFontMeta, options: ResolveFontOptions) {
    const weights = prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: font.variable,
      weights: font.weights.map(String),
    })
    const styles = options.styles.filter(style => font.styles.includes(style))
    const subsets = options.subsets ? options.subsets.filter(subset => font.subsets.includes(subset)) : [font.defSubset]
    if (weights.length === 0 || styles.length === 0)
      return []

    const fontDetail = await fetchWithRetries(`${BASE_URL}/fonts/${font.id}`).then(res => res.json() as Promise<FontsourceFontDetail>)
    const fontFaceData: FontFaceData[] = []

    for (const subset of subsets) {
      for (const style of styles) {
        for (const { weight, variable } of weights) {
          if (variable) {
            try {
              const variableAxes = await ctx.storage.getItem(`fontsource:${font.family}-axes.json`, () => fetchWithRetries(`${BASE_URL}/variable/${font.id}`).then(res => res.json() as Promise<FontsourceVariableFontDetail>))
              if (variableAxes && variableAxes.axes.wght) {
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
    async resolveFont(fontFamily, options) {
      const font = familyMap.get(fontFamily)
      if (!font) {
        return
      }

      return {
        fonts: await ctx.storage.getItem(`fontsource:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(font, options)),
        fallbacks: getFallbacks(font.category),
      }
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
