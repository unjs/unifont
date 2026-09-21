import { CATALOGUE_PAGE, FEATURED_FAMILIES, specimenGlyphs } from '#shared/featured'
import { defineCachedFunction } from 'nitro/cache'
import { searchCatalogue } from './catalogue'
import { canonicalFamily } from './family'
import { cssComment, toFontFaceCss } from './css'
import { useUnifont } from './unifont'
import { specimenSubsets, specimenWeights } from './weights'

const FAILED = 'no provider could resolve this family'

/** Every family the sheet accounts for, and the ones it could not resolve. */
export function sheetFamilies(css: string) {
  const blocks = [...css.matchAll(/\/\* (.+?): (.+?) \*\//g)]
  return { total: blocks.length, missing: blocks.filter(block => block[2] === FAILED).map(block => block[1]!) }
}

/** Anything missing from a prerendered sheet stays missing until the next deployment. */
export function assertResolved(css: string, label: string) {
  if (!import.meta.prerender) {
    return css
  }

  const { total, missing } = sheetFamilies(css)
  if (!missing.length) {
    return css
  }

  const report = `${label}: no provider resolved ${missing.join(', ')}`
  // A page of specimens with a few holes still reads; one with nothing in it does not.
  if (missing.length >= total) {
    throw new Error(`${report}. Refusing to prerender a stylesheet with nothing in it.`)
  }

  console.warn(`${report}. Baking the rest.`)
  return css
}

/** Only Google can subset to a glyph list; the others ignore this and answer in full. */
export function specimenOptions(family: string) {
  return { google: { experimental: { glyphs: specimenGlyphs(family) } } }
}

/**
 * `@font-face` rules for several families at once. The weight and subset match `preset=warm`, so
 * hovering a card and opening its page reuses the file already downloaded. A family no provider
 * knows becomes a comment rather than failing the whole sheet.
 *
 * `glyphs` cuts each face to the characters a grid sets, which only Google honours; pass it only
 * for text known in advance.
 *
 * No metric-matched fallback: `fontaine` sources those from `local("sans-serif")`, which matches
 * no installed family, so the face never loads and reading the metrics for it costs a download
 * of every font in the grid.
 */
export async function specimenCss(
  families: string[],
  overrides: { weights?: string[], subsets?: string[], glyphs?: boolean } = {},
) {
  const unifont = await useUnifont()
  const needsProperties = !overrides.weights || !overrides.subsets

  async function block(family: string) {
    const properties = needsProperties ? await unifont.getFontProperties(family) : undefined
    const resolved = await unifont.resolveFont(family, {
      weights: overrides.weights ?? specimenWeights(properties?.weights ?? ['400']),
      styles: ['normal'],
      subsets: overrides.subsets ?? specimenSubsets(properties?.subsets),
      formats: ['woff2'],
      options: overrides.glyphs ? specimenOptions(family) : undefined,
    })
    if (!resolved.fonts.length) {
      return null
    }
    return [
      `/* ${cssComment(family)}: ${resolved.provider} */`,
      toFontFaceCss(family, resolved.fonts),
    ].join('\n')
  }

  const blocks = await Promise.all(families.map(async (requested) => {
    const family = await canonicalFamily(requested)
    // Retried once: a sheet baked at build time keeps its holes for the life of the deployment.
    for (const attempt of [0, 1]) {
      try {
        const css = await block(family)
        if (css) {
          return css
        }
      }
      catch {
        if (attempt) {
          return `/* ${cssComment(family)}: ${FAILED} */`
        }
      }
    }
    return `/* ${cssComment(family)}: ${FAILED} */`
  }))

  return `${blocks.join('\n\n')}\n`
}

/**
 * The two grids served at a fixed URL, cached so that the page inlining one of them costs a
 * storage read rather than dozens of provider lookups.
 */
export const specimenSheet = defineCachedFunction(async (grid: 'featured' | 'catalogue') => {
  if (grid === 'featured') {
    return specimenCss([...FEATURED_FAMILIES], { glyphs: true })
  }
  const { families } = await searchCatalogue({ query: '', limit: CATALOGUE_PAGE, offset: 0 })
  return specimenCss(families.map(entry => entry.family), { glyphs: true })
}, { name: 'specimen-sheet', maxAge: 60 * 60 * 24, getKey: grid => grid })
