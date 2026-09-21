import { defineEventHandler } from 'nuxt/server'
import { assertResolved, specimenSheet } from '#server/utils/specimens'

/** The catalogue's first page, at a fixed URL with no query so that it can be prerendered. */
export default defineEventHandler(async (event) => {
  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  return assertResolved(await specimenSheet('catalogue'), 'catalogue.css')
})
