import { HOTLINK_NOTICE, isCrossSiteStylesheet, STYLESHEET_PATH } from '#shared/hotlink'
import { defineEventHandler, getRequestURL } from 'nitro/h3'

const STYLESHEET = new RegExp(STYLESHEET_PATH)

/**
 * The CSS endpoints answer this site's pages and anything reading them deliberately, but not
 * another site linking them as production infrastructure.
 *
 * On Vercel the same refusal is in the routing layer, which is the only one that sees a request
 * for a prerendered sheet. This one covers dev, and any deployment that is not Vercel.
 */
export default defineEventHandler((event) => {
  if (!STYLESHEET.test(getRequestURL(event).pathname)) {
    return
  }

  // Set either way: a shared cache must not hand a stored sheet to a request we refuse.
  event.res.headers.set('vary', 'Sec-Fetch-Site, Sec-Fetch-Dest')

  const headers = { site: event.req.headers.get('sec-fetch-site'), dest: event.req.headers.get('sec-fetch-dest') }
  if (!isCrossSiteStylesheet(headers)) {
    return
  }

  event.res.status = 403
  event.res.headers.set('content-type', 'text/css; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600')
  return HOTLINK_NOTICE
})
