import { hash } from 'ohash'

import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider, type ResolveFontOptions } from '../types'

interface ProviderOption {
  id: string[] | string
}

const fontAPI = $fetch.create({ baseURL: 'https://typekit.com' })
const fontCSSAPI = $fetch.create({ baseURL: 'https://use.typekit.net' })

async function getAdobeFontMeta(id: string): Promise<AdobeFontKit> {
  const { kit } = await fontAPI<{ kit: AdobeFontKit }>(`/api/v1/json/kits/${id}/published`, { responseType: 'json' })
  return kit
}

export default defineFontProvider<ProviderOption>('adobe', async (options, ctx) => {
  if (!options.id) {
    return
  }

  const familyMap = new Map<string, string>()
  const fonts = {
    kits: [] as AdobeFontKit[],
  }

  const kits = typeof options.id === 'string' ? [options.id] : options.id
  await Promise.all(kits.map(async (id) => {
    const meta = await ctx.storage.getItem<AdobeFontKit>(`adobe:meta-${id}.json`, () => getAdobeFontMeta(id))
    if (!meta) {
      throw new TypeError('No font metadata found in adobe response.')
    }

    fonts.kits.push(meta)
    for (const family of meta.families) {
      familyMap.set(family.name, family.id)
    }
  }))

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    options.weights = options.weights.map(String)

    for (const kit of fonts.kits) {
      const font = kit.families.find(f => f.name === family)
      if (!font) {
        continue
      }

      const styles: string[] = []
      for (const style of font.variations) {
        if (style.includes('i') && !options.styles.includes('italic')) {
          continue
        }
        if (!options.weights.includes(String(`${style.slice(-1)}00`))) {
          continue
        }
        styles.push(style)
      }
      if (styles.length === 0) {
        continue
      }
      const css = await fontCSSAPI<string>(`${kit.id}.css`)

      // TODO: Not sure whether this css_names array always has a single element. Still need to investigate.
      const cssName = font.css_names[0] ?? family.toLowerCase().split(' ').join('-')

      return extractFontFaceData(css, cssName)
    }

    return []
  }

  return {
    async resolveFont(family, options) {
      if (!familyMap.has(family)) {
        return
      }

      const fonts = await ctx.storage.getItem(`adobe:${family}-${hash(options)}-data.json`, () => getFontDetails(family, options))
      return { fonts }
    },
  }
})

interface AdobeFontKit {
  id: string
  families: AdobeFontFamily[]
}

interface AdobeFontFamily {
  id: string
  name: string
  slug: string
  css_names: string[]
  css_stack: string
  variations: string[]
}
