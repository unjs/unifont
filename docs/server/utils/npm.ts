import type { FontStyles, ProviderResolveFontOptions } from 'unifont'
import { NPM_FONTS } from '#shared/npm-fonts'
import { defineFontProvider, providers } from 'unifont'

const byFamily = new Map(NPM_FONTS.map(font => [font.family.toLowerCase(), font]))

const ALL_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

/**
 * The `npm` provider behind a curated index. Upstream has no `listFonts()`, because its library is
 * the whole registry; these are families it can resolve that the font CDNs do not carry, each with
 * the package and stylesheet it needs, so the site can list them beside every other family.
 */
export const curatedNpm = defineFontProvider('npm', async (_options, ctx) => {
  const npm = await providers.npm()(ctx)
  if (!npm) {
    return
  }

  function resolve(family: string, options: ProviderResolveFontOptions) {
    const font = byFamily.get(family.toLowerCase())
    if (!font) {
      return
    }
    return npm!.resolveFont(family, {
      ...options,
      options: { package: font.package, ...(font.file ? { file: font.file } : {}) },
    })
  }

  // A package publishes no index to read properties from, so they come from the faces themselves.
  // One resolve per family, held for the life of the process because the answer is a parsed
  // stylesheet at a pinned version.
  const properties = new Map<string, Promise<{ weights: string[], styles: FontStyles[] } | undefined>>()

  async function readProperties(family: string) {
    const resolved = await resolve(family, {
      weights: ALL_WEIGHTS,
      styles: ['normal', 'italic'],
      subsets: [],
      formats: ['woff2'],
    })
    if (!resolved?.fonts.length) {
      return
    }

    const weights = new Set<string>()
    const styles = new Set<FontStyles>()
    for (const face of resolved.fonts) {
      if (face.weight !== undefined) {
        weights.add(Array.isArray(face.weight) ? face.weight.join(' ') : String(face.weight))
      }
      if (face.style === 'normal' || face.style === 'italic' || face.style === 'oblique') {
        styles.add(face.style)
      }
    }

    return { weights: [...weights], styles: [...styles] }
  }

  return {
    listFonts: () => NPM_FONTS.map(font => font.family),

    resolveFont: (family, options) => resolve(family, options),

    getFontProperties(family) {
      const key = family.toLowerCase()
      if (!properties.has(key)) {
        // A read that answered nothing is not an answer, so the next call asks again.
        properties.set(key, readProperties(family).catch(() => undefined).then((result) => {
          if (!result) {
            properties.delete(key)
          }
          return result
        }))
      }
      return properties.get(key)!
    },
  }
})
