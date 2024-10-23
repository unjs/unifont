import type { ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider } from '../utils'

const fontAPI = $fetch.create({ baseURL: 'https://api.fontshare.com/v2' })
export default defineFontProvider('fontshare', async (_options, ctx) => {
  const fontshareFamilies = new Set<string>()

  const fonts = await ctx.storage.getItem('fontshare:meta.json', async () => {
    const fonts: FontshareFontMeta[] = []
    let offset = 0
    let chunk
    do {
      chunk = await fontAPI<{ fonts: FontshareFontMeta[], has_more: boolean }>('/fonts', {
        responseType: 'json',
        query: {
          offset,
          limit: 100,
        },
      })
      fonts.push(...chunk.fonts)
      offset++
    } while (chunk.has_more)
    return fonts
  })

  for (const font of fonts) {
    fontshareFamilies.add(font.name)
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
  // https://api.fontshare.com/v2/css?f[]=alpino@300
    const font = fonts.find(f => f.name === family)!
    const numbers: number[] = []
    for (const style of font.styles) {
      if (style.is_italic && !options.styles.includes('italic')) {
        continue
      }
      if (!style.is_italic && !options.styles.includes('normal')) {
        continue
      }
      if (!options.weights.includes(String(style.weight.weight))) {
        continue
      }
      numbers.push(style.weight.number)
    }

    if (numbers.length === 0)
      return []

    const css = await fontAPI<string>(`/css?f[]=${`${font.slug}@${numbers.join(',')}`}`)

    // TODO: support subsets and axes
    return extractFontFaceData(css)
  }

  return {
    async resolveFont(fontFamily, defaults) {
      if (!fontshareFamilies.has(fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`fontshare:${fontFamily}-${hash(defaults)}-data.json`, () => getFontDetails(fontFamily, defaults))

      return { fonts }
    },
  }
})

/** internal */

interface FontshareFontMeta {
  slug: string
  name: string
  styles: Array<{
    default: boolean
    file: string
    id: string
    is_italic: boolean
    is_variable: boolean
    properties: {
      ascending_leading: number
      body_height: null
      cap_height: number
      descending_leading: number
      max_char_width: number
      x_height: number
      y_max: number
      y_min: number
    }
    weight: {
      label: string
      name: string
      native_name: null
      number: number
      weight: number
    }
  }>
}
