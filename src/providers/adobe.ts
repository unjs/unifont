import type { ResolveFontOptions } from '../types'

import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider, prepareWeights } from '../utils'

interface ProviderOption {
  id: string[] | string
}

const fontCSSAPI = $fetch.create({ baseURL: 'https://use.typekit.net' })

async function getAdobeFontMeta(id: string): Promise<AdobeFontKit> {
  const { kit } = await $fetch<{ kit: AdobeFontKit }>(`https://typekit.com/api/v1/json/kits/${id}/published`, { responseType: 'json' })
  return kit
}

const KIT_REFRESH_TIMEOUT = 5 * 60 * 1000

export default defineFontProvider<ProviderOption>('adobe', async (options, ctx) => {
  if (!options.id) {
    return
  }

  const familyMap = new Map<string, string>()
  const notFoundFamilies = new Set<string>()
  const fonts = {
    kits: [] as AdobeFontKit[],
  }
  let lastRefreshKitTime: number

  const kits = typeof options.id === 'string' ? [options.id] : options.id

  await fetchKits()

  async function fetchKits(bypassCache: boolean = false) {
    familyMap.clear()
    notFoundFamilies.clear()
    fonts.kits = []

    await Promise.all(kits.map(async (id) => {
      let meta: AdobeFontKit
      const key = ctx.cacheKey('meta.json', 'kit', id)
      if (bypassCache) {
        meta = await getAdobeFontMeta(id)
        await ctx.storage.setItem(key, meta)
      }
      else {
        meta = await ctx.storage.getItem(key, () => getAdobeFontMeta(id))
      }

      if (!meta) {
        throw new TypeError('No font metadata found in adobe response.')
      }

      fonts.kits.push(meta)
      for (const family of meta.families) {
        familyMap.set(family.name, family.id)
      }
    }))
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    options.weights = options.weights.map(String)

    for (const kit of fonts.kits) {
      const font = kit.families.find(f => f.name === family)
      if (!font) {
        continue
      }

      const weights = prepareWeights({
        inputWeights: options.weights,
        hasVariableWeights: false,
        weights: font.variations.map(v => `${v.slice(-1)}00`),
      }).map(w => w.weight)

      const styles: string[] = []
      for (const style of font.variations) {
        if (style.includes('i') && !options.styles.includes('italic')) {
          continue
        }
        if (!weights.includes(String(`${style.slice(-1)}00`))) {
          continue
        }
        styles.push(style)
      }
      if (styles.length === 0) {
        continue
      }
      const css = await fontCSSAPI<string>(`/${kit.id}.css`)

      // TODO: Not sure whether this css_names array always has a single element. Still need to investigate.
      const cssName = font.css_names[0] ?? family.toLowerCase().split(' ').join('-')

      return extractFontFaceData(css, cssName).filter((font) => {
        const [lowerWeight, upperWeight] = Array.isArray(font.weight) ? font.weight : [0, 0]

        return (
          (!options.styles || !font.style || options.styles.includes(font.style as 'normal'))
          && (!weights || !font.weight || Array.isArray(font.weight) ? weights.some(weight => Number(weight) <= upperWeight || Number(weight) >= lowerWeight) : weights.includes(String(font.weight)))
        )
      })
    }

    return []
  }

  return {
    listFonts() {
      return [...familyMap.keys()]
    },
    async resolveFont(family, options) {
      // Check if family is in negative cache first (used to prevent unnecessary refreshes)
      if (notFoundFamilies.has(family)) {
        return
      }

      // Try refreshing the kit metadata if family is not found. We use a debounce mechanism to avoid frequent refreshes.
      if (!familyMap.has(family)) {
        const lastRefetch = lastRefreshKitTime || 0
        const now = Date.now()

        if (now - lastRefetch > KIT_REFRESH_TIMEOUT) {
          lastRefreshKitTime = Date.now()
          await fetchKits(true)
        }
      }

      if (!familyMap.has(family)) {
        // Add to negative cache to avoid future refreshes for this family
        notFoundFamilies.add(family)
        return
      }

      const fonts = await ctx.storage.getItem(
        ctx.cacheKey('data.json', family, options),
        () => getFontDetails(family, options),
      )
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
