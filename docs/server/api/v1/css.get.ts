import { createError, getQuery, getRequestURL, setResponseHeader } from 'nitro/h3'
import { defineCachedHandler } from 'nitro/cache'
import { metricFallbackCss, toFontFaceCss } from '../../utils/css'
import { useUnifont } from '../../utils/unifont'

/**
 * One stylesheet for many families, so a specimen grid costs a single request. A family no
 * provider knows is skipped with a comment rather than failing the whole sheet.
 */
export default defineCachedHandler(async (event) => {
  const query = getQuery(event)
  const families = String(query.families ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 40)

  if (!families.length) {
    throw createError({ statusCode: 400, statusMessage: 'Pass `?families=Newsreader,Switzer`.' })
  }

  const weights = String(query.weights ?? '400').split(',').map(part => part.trim()).filter(Boolean)
  const subsets = String(query.subsets ?? 'latin').split(',').map(part => part.trim()).filter(Boolean)

  const unifont = await useUnifont()

  const blocks = await Promise.all(families.map(async (family) => {
    try {
      const resolved = await unifont.resolveFont(family, {
        weights,
        styles: ['normal'],
        subsets,
        formats: ['woff2'],
      })
      if (!resolved.fonts.length) {
        return `/* ${family}: no provider could resolve this family */`
      }
      const fallbackCss = await metricFallbackCss(family, resolved.fonts, resolved.fallbacks ?? [])
      return [
        `/* ${family}: ${resolved.provider} */`,
        toFontFaceCss(family, resolved.fonts),
        fallbackCss,
      ].filter(Boolean).join('\n')
    }
    catch {
      return `/* ${family}: provider request failed */`
    }
  }))

  setResponseHeader(event, 'content-type', 'text/css; charset=utf-8')
  return `${blocks.join('\n\n')}\n`
}, {
  maxAge: 60 * 60 * 24,
  name: 'batch-css',
  getKey: event => new URL(getRequestURL(event)).search,
})
