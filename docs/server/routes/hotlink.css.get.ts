import { HOTLINK_NOTICE } from '#shared/hotlink'
import { defineEventHandler } from 'nitro/h3'

/** Prerendered, so the routing layer has a body to answer a refused stylesheet with. */
export default defineEventHandler((event) => {
  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  return HOTLINK_NOTICE
})
