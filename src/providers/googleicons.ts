import type { ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider } from '../utils'

export default defineFontProvider('googleicons', async (_options, ctx) => {
  const googleIcons = await ctx.storage.getItem('googleicons:meta.json', async () => {
    const response: { families: string[] } = JSON.parse((await $fetch<string>(
      'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true',
    )).split('\n').slice(1).join('\n')) // remove the first line which makes it an invalid JSON

    return response.families
  })

  const userAgents = {
    woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ttf: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16',
  // eot: 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
  // woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  // svg: 'Mozilla/4.0 (iPad; CPU OS 4_0_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/4.1 Mobile/9A405 Safari/7534.48.3',
  }

  async function getFontDetails(family: string, options: ResolveFontOptions) {
    // Google Icons require sorted icon names, or we will see a 400 error
    const iconNames = options.glyphs?.sort().join(',')

    let css = ''

    if (family.includes('Icons')) {
      css += await $fetch<string>('/css2', {
        baseURL: 'https://fonts.googleapis.com/icon',
        query: {
          family,
        },
      })
    }

    for (const extension in userAgents) {
    // Legacy Material Icons
      if (family.includes('Icons')) {
        css += await $fetch<string>('/icon', {
          baseURL: 'https://fonts.googleapis.com',
          headers: { 'user-agent': userAgents[extension as keyof typeof userAgents] },
          query: {
            family,
          },
        })
      }
      // New Material Symbols
      else {
        css += await $fetch<string>('/css2', {
          baseURL: 'https://fonts.googleapis.com',
          headers: { 'user-agent': userAgents[extension as keyof typeof userAgents] },
          query: {
            family: `${family}:` + `opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`,
            ...(iconNames && { icon_names: iconNames }),
          },
        })
      }
    }

    return extractFontFaceData(css)
  }

  return {
    async resolveFont(fontFamily, options) {
      if (!googleIcons.includes(fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`googleicons:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(fontFamily, options))
      return { fonts }
    },
  }
})
