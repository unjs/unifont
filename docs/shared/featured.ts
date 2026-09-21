/**
 * The families on the front index, spanning providers and typographic registers. Order is load
 * order: the Fontshare faces sit late because only Google will subset to a glyph list, so they are
 * five times the size of the rest.
 */
export const FEATURED_FAMILIES = [
  'Newsreader',
  'Instrument Serif',
  'Fraunces',
  'EB Garamond',
  'Bricolage Grotesque',
  'Space Grotesk',
  'Switzer',
  'Spectral',
  'Cormorant Garamond',
  'DM Serif Display',
  'Big Shoulders Display',
  'Anton',
  // Fontshare, unsubsetted.
  'Cabinet Grotesk',
  'Erode',
  'Sentient',
  'JetBrains Mono',
  'IBM Plex Mono',
  'Space Mono',
] as const

/**
 * The name a specimen face is declared under. Firefox treats any new `@font-face` for a family as
 * a reason to re-resolve every element set in it, and repaints them in the fallback until the new
 * file lands: with a metric-matched fallback that is a flicker with no reflow to explain it. So a
 * specimen face never reuses the family's own name, which a grid or the interface may already have
 * declared and loaded.
 */
export function specimenAlias(family: string) {
  return `${family} specimen`
}

export const CATALOGUE_PAGE = 36

/** One shared line for the comparison view, so no provider is flattered by its own sample. */
export const SPECIMEN_LINE = 'Handgloves & 0123'

export const SPECIMEN_TEXT = 'Typography is what language looks like.'

/** Long enough to wrap in either column of the fallback comparison, where the reflow shows. */
export const FALLBACK_TEXT = 'Type is laid out before the font arrives, so the browser sets these lines in whatever it already has. When the real file lands they are all redrawn, and the page moves by the difference. How far it moves is what a metric-matched substitute changes.'

/** The characters a specimen sets, for providers that can subset to a glyph list. */
export function specimenGlyphs(family: string) {
  return [...new Set(`${family}${SPECIMEN_TEXT}${SPECIMEN_LINE}`)].sort()
}
