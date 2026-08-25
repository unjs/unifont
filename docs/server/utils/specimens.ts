import { CATALOGUE_PAGE, FEATURED_FAMILIES, specimenGlyphs } from '#shared/featured'
import { defineCachedFunction } from 'nitro/cache'
import { searchCatalogue } from './catalogue'
import { cssComment, toFontFaceCss } from './css'
import { useUnifont } from './unifont'
import { specimenSubsets, specimenWeights } from './weights'

/** Only Google can subset to a glyph list; the others ignore this and answer in full. */
export function specimenOptions(family: string) {
  return { google: { experimental: { glyphs: specimenGlyphs(family) } } }
}

/**
 * `@font-face` rules for a grid of specimens. The weight and subset match `preset=warm`, so
 * hovering a card and opening its page reuses the file already downloaded. A family no provider
 * knows becomes a comment rather than failing the whole sheet.
 *
 * No metric-matched fallback: `fontaine` sources those from `local("sans-serif")`, which matches
 * no installed family, so the face never loads and reading the metrics for it costs a download
 * of every font in the grid.
 */
export async function specimenCss(
  families: string[],
  overrides: { weights?: string[], subsets?: string[] } = {},
) {
  const unifont = await useUnifont()
  const needsProperties = !overrides.weights || !overrides.subsets

  const blocks = await Promise.all(families.map(async (family) => {
    try {
      const properties = needsProperties ? await unifont.getFontProperties(family) : undefined
      const resolved = await unifont.resolveFont(family, {
        weights: overrides.weights ?? specimenWeights(properties?.weights ?? ['400']),
        styles: ['normal'],
        subsets: overrides.subsets ?? specimenSubsets(properties?.subsets),
        formats: ['woff2'],
        options: specimenOptions(family),
      })
      if (!resolved.fonts.length) {
        return `/* ${cssComment(family)}: no provider could resolve this family */`
      }
      return [
        `/* ${cssComment(family)}: ${resolved.provider} */`,
        toFontFaceCss(family, resolved.fonts),
      ].join('\n')
    }
    catch {
      return `/* ${cssComment(family)}: provider request failed */`
    }
  }))

  return `${blocks.join('\n\n')}\n`
}

/**
 * The two grids served at a fixed URL, cached so that the page inlining one of them costs a
 * storage read rather than dozens of provider lookups.
 */
export const specimenSheet = defineCachedFunction(async (grid: 'featured' | 'catalogue') => {
  if (grid === 'featured') {
    return specimenCss([...FEATURED_FAMILIES])
  }
  const { families } = await searchCatalogue({ query: '', limit: CATALOGUE_PAGE, offset: 0 })
  return specimenCss(families.map(entry => entry.family))
}, { name: 'specimen-sheet', maxAge: 60 * 60 * 24, getKey: grid => grid })
