import { hash } from 'ohash'

import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider, type ResolveFontOptions } from '../types'

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
    const weights = options.weights.filter(weight => font.weights.includes(Number(weight)))
    const styleMap = {
      italic: 'i',
      oblique: 'i',
      normal: '',
    }
    const styles = new Set(options.styles.map(i => styleMap[i]))
    if (weights.length === 0 || styles.size === 0)
      return []

    const resolvedVariants = weights.flatMap(w => [...styles].map(s => `${w}${s}`))

    const css = await fontAPI<string>('/css', {
      query: {
        family: `${id}:${resolvedVariants.join(',')}`,
      },
    })

    // TODO: support subsets
    return extractFontFaceData(css)
  }

  return {
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
