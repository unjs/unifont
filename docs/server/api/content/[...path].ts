import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { content } from '../../utils/content'

/**
 * `content.handler` takes a web-standard `Request`, built by hand here: whether h3 exposes
 * `toRequest` or `toWebRequest` through `nitro/h3` varies with how it resolves.
 */
export default defineEventHandler((event) => {
  const request = new Request(getRequestURL(event), {
    method: event.req.method,
    headers: event.req.headers,
  })
  return content.handler(request)
})
