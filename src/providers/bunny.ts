import type { FontFaceData, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights, splitCssIntoSubsets } from '../utils'

const fontAPI = $fetch.create({ baseURL: 'https://fonts.bunny.net' })

export default defineFontProvider('bunny', async (_options, ctx) => {
  const familyMap = new Map<string, string>()

  const fonts = await ctx.storage.getItem('bunny:meta.json', () => fontAPI<BunnyFontMeta>('/list', { responseType: 'json' }))
  for (const [id, family] of Object.entries(fonts)) {
    familyMap.set(family.familyName, id)
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    const id = familyMap.get(family) as keyof typeof fonts
    const font = fonts[id]!
    const weights = prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: false,
      weights: font.weights.map(String),
    })
    const styleMap = {
      italic: 'i',
      oblique: 'i',
      normal: '',
    }
    const styles = new Set(options.styles.map(i => styleMap[i]))
    if (weights.length === 0 || styles.size === 0)
      return []

    const resolvedVariants = weights.flatMap(w => [...styles].map(s => `${w.weight}${s}`))

    const css = await fontAPI<string>('/css', {
      query: {
        family: `${id}:${resolvedVariants.join(',')}`,
      },
    })

    const resolvedFontFaceData: FontFaceData[] = []

    const groups = splitCssIntoSubsets(css).filter(group => group.subset ? options.subsets.includes(group.subset) : true)
    for (const group of groups) {
      const data = extractFontFaceData(group.css)
      data.map((f) => {
        f.meta ??= {}
        if (group.subset) {
          f.meta.subset = group.subset
        }
        return f
      })
      resolvedFontFaceData.push(...data)
    }

    return cleanFontFaces(resolvedFontFaceData, options.formats)
  }

  return {
    listFonts() {
      return [...familyMap.keys()]
    },
    async resolveFont(fontFamily, defaults) {
      if (!familyMap.has(fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`bunny:${fontFamily}-${hash(defaults)}-data.json`, () => getFontDetails(fontFamily, defaults))
      return { fonts }
    },
  }
})

/** internal */

interface BunnyFontMeta {
  [key: string]: {
    category: string
    defSubset: string
    familyName: string
    isVariable: boolean
    styles: string[]
    variants: Record<string, number>
    weights: number[]
  }
}
