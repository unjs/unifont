import type { FontStyles, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider, prepareWeights } from '../utils'

const fontAPI = $fetch.create({ baseURL: 'https://api.fontshare.com/v2' })

function getFallbacks(category: string): string[] | undefined {
  if (category.includes('Serif'))
    return ['serif']
  if (category.includes('Sans'))
    return ['sans-serif']
  return undefined
}

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

  async function getFontDetails(font: FontshareFontMeta, options: ResolveFontOptions) {
    const numbers: number[] = []

    const weights = prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: false,
      weights: font.styles.map(s => String(s.weight.weight)),
    }).map(w => w.weight)

    for (const style of font.styles) {
      if (style.is_italic && !options.styles.includes('italic')) {
        continue
      }
      if (!style.is_italic && !options.styles.includes('normal')) {
        continue
      }
      if (!weights.includes(String(style.weight.weight))) {
        continue
      }
      numbers.push(style.weight.number)
    }

    if (numbers.length === 0)
      return []

    const css = await fontAPI<string>(`/css?f[]=${`${font.slug}@${numbers.join(',')}`}`)

    // TODO: support axes
    return cleanFontFaces(extractFontFaceData(css), options.formats)
  }

  return {
    listFonts() {
      return [...fontshareFamilies]
    },
    getAvailableFontProperties(fontFamily) {
      if (!fontshareFamilies.has(fontFamily))
        return
      const font = fonts.find(f => f.name === fontFamily)!
      const styles = new Set<FontStyles>(['normal'])
      const weights = new Set<string>()
      for (const style of font.styles) {
        if (style.is_italic) {
          styles.add('italic')
        }
        // TODO: support variable fonts
        if (style.is_variable) {
        //   const axe = font.axes.find(e => e.property === 'wght')
        //   if (axe) {
        //     weights.add(`${axe.range_left} ${axe.range_right}`)
        //   }
        }
        else {
          weights.add(style.weight.weight.toString())
        }
      }
      return {
        formats: ['woff2', 'woff', 'ttf'],
        styles: [...styles],
        subsets: undefined,
        weights: [...weights],
      }
    },
    async resolveFont(fontFamily, defaults) {
      if (!fontshareFamilies.has(fontFamily)) {
        return
      }

      // https://api.fontshare.com/v2/css?f[]=alpino@300
      const font = fonts.find(f => f.name === fontFamily)!

      return {
        fonts: await ctx.storage.getItem(`fontshare:${fontFamily}-${hash(defaults)}-data.json`, () => getFontDetails(font, defaults)),
        fallbacks: getFallbacks(font.category),
      }
    },
  }
})

/** internal */

interface FontshareFontMeta {
  slug: string
  name: string
  category: string
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
  axes: Array<{
    name: string
    property: 'wght' | 'ital' | 'opsz'
    range_default: number
    range_left: number
    range_right: number
  }>
}
