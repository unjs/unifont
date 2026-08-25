/**
 * Redraws `public/favicon-*.svg` as the wordmark's own `u`. A favicon cannot load a webfont, so
 * the glyph has to be an outline. Run by hand when the display face changes; output is committed.
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { create } from 'fontkitten'
import { createUnifont, providers } from 'unifont'

const FAMILY = 'Newsreader'
const WEIGHT = 600
const CHARACTER = 'u'

// The token values, which an SVG served as a file cannot read from the stylesheet.
const INK = { light: '#1d1713', dark: '#efe9e3' }
const ACCENT = { light: '#c73800', dark: '#ff7a45' }

const unifont = await createUnifont([providers.google()])
const { fonts } = await unifont.resolveFont(FAMILY, {
  weights: [String(WEIGHT)],
  styles: ['normal'],
  subsets: ['latin'],
  // `fontkitten` reads uncompressed tables.
  formats: ['ttf'],
  options: { google: { experimental: { glyphs: [CHARACTER] } } },
})

const url = fonts.flatMap(face => face.src).find(source => 'url' in source)?.url
if (!url) {
  throw new Error(`Could not resolve a ttf for ${FAMILY} ${WEIGHT}.`)
}

const font = create(new Uint8Array(await fetch(url).then(res => res.arrayBuffer())))
const instance = font.variationAxes?.wght ? font.getVariation({ wght: WEIGHT }) : font
const glyph = instance.glyphsForString(CHARACTER)[0]
if (!glyph) {
  throw new Error(`No glyph for ${CHARACTER} in ${FAMILY}.`)
}

const { minX, minY, maxX, maxY } = glyph.bbox

// The glyph and the dot are measured and placed as one shape on a 32-unit canvas.
const DOT_RADIUS = 2.6
const GAP = 2.2
const PAD = 3.5

const scale = (32 - PAD * 2 - GAP - DOT_RADIUS * 2) / (maxX - minX)
const glyphHeight = (maxY - minY) * scale
const dotCentreY = 32 / 2 + glyphHeight / 2 - DOT_RADIUS
const left = PAD
const top = (32 - glyphHeight) / 2

const path = glyph.path
  .scale(scale, -scale)
  .translate(left - minX * scale, top + maxY * scale)
  .toSVG()

const dotX = left + (maxX - minX) * scale + GAP + DOT_RADIUS

/** @param {'light' | 'dark'} scheme */
function svg(scheme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <title>unifont</title>
  <!-- ${FAMILY} ${WEIGHT}, outlined by \`scripts/build-favicon.mjs\`. Edit that, not this. -->
  <path d="${path}" fill="${INK[scheme]}" />
  <circle cx="${dotX.toFixed(2)}" cy="${dotCentreY.toFixed(2)}" r="${DOT_RADIUS}" fill="${ACCENT[scheme]}" />
</svg>
`
}

for (const scheme of /** @type {const} */ (['light', 'dark'])) {
  const target = fileURLToPath(new URL(`../public/favicon-${scheme}.svg`, import.meta.url))
  await writeFile(target, svg(scheme))
  console.log(`wrote ${target}`)
}
