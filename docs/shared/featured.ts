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

export const CATALOGUE_PAGE = 36

/** One shared line for the comparison view, so no provider is flattered by its own sample. */
export const SPECIMEN_LINE = 'Handgloves & 0123'

export const SPECIMEN_TEXT = 'Typography is what language looks like.'

/** The characters a specimen sets, for providers that can subset to a glyph list. */
export function specimenGlyphs(family: string) {
  return [...new Set(`${family}${SPECIMEN_TEXT}${SPECIMEN_LINE}`)].sort()
}
