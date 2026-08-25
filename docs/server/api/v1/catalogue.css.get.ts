import { defineEventHandler } from 'nitro/h3'
import { specimenSheet } from '#server/utils/specimens'

/** The catalogue's first page, at a fixed URL with no query so that it can be prerendered. */
export default defineEventHandler(async (event) => {
  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  return specimenSheet('catalogue')
})
