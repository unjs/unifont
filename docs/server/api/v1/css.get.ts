import { createError, getQuery } from 'nuxt/server'
import { defineCachedHandler } from 'nitro/cache'
import { specimenCss } from '../../utils/specimens'

/** One stylesheet for many families, so a specimen grid costs a single request. */
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
  })
}, {
  maxAge: 60 * 60 * 24,
  name: 'batch-css',
  // Undeclared parameters are stripped, so a stray one cannot multiply cache entries.
  allowQuery: ['families', 'weights', 'subsets'],
})
