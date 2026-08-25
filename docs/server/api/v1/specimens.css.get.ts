import { defineEventHandler } from 'nitro/h3'
import { specimenSheet } from '#server/utils/specimens'

/** The front page's index, at a fixed URL with no query so that it can be prerendered. */
export default defineEventHandler(async (event) => {
  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  return specimenSheet('featured')
})
