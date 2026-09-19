import { createError, getQuery } from 'nuxt/server'
import { defineCachedHandler } from 'nitro/cache'
import { specimenCss } from '../../utils/specimens'

/** One stylesheet for many families. `preset=specimen` cuts each face to the glyphs a grid sets. */
export default defineCachedHandler(async (event) => {
  const query = getQuery(event)
  const list = (value: unknown) => String(value ?? '').split(',').map(part => part.trim()).filter(Boolean)

  const families = list(query.families).slice(0, 40)
  if (!families.length) {
    throw createError({ status: 400, statusText: 'Pass `?families=Newsreader,Switzer`.' })
  }

  const weights = list(query.weights)
  const subsets = list(query.subsets)

  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  return specimenCss(families, {
    weights: weights.length ? weights : undefined,
    subsets: subsets.length ? subsets : undefined,
    glyphs: query.preset === 'specimen',
  })
}, {
  maxAge: 60 * 60 * 24,
  name: 'batch-css',
  // Undeclared parameters are stripped, so a stray one cannot multiply cache entries.
  allowQuery: ['families', 'weights', 'subsets', 'preset'],
})
