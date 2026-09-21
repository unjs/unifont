/** Fails when a curated entry stops resolving: these are upstream packages that move. */
import { createUnifont, providers } from 'unifont'
import { NPM_FONTS } from '../shared/npm-fonts.ts'

const unifont = await createUnifont([providers.npm()])

const results = await Promise.all(NPM_FONTS.map(async (font) => {
  const options = { npm: { package: font.package, ...(font.file ? { file: font.file } : {}) } }
  try {
    const { fonts } = await unifont.resolveFont(font.family, { formats: ['woff2'], options })
    return { font, faces: fonts.length }
  }
  catch (error) {
    return { font, faces: 0, error }
  }
}))

for (const { font, faces, error } of results) {
  console.log(`${faces ? '✓' : '✗'} ${font.family} — ${font.package}${font.file ? `/${font.file}` : ''}: ${faces} faces${error ? ` (${error.message})` : ''}`)
}

const broken = results.filter(result => !result.faces)
if (broken.length) {
  console.error(`\n${broken.length} of ${results.length} npm entries resolved nothing.`)
  process.exitCode = 1
}
