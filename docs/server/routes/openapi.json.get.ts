import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { openApiDocument } from '../utils/openapi'

/** The OpenAPI description of the public API. Mirrored at `/api/openapi.json`. */
export default defineEventHandler((event) => {
  const origin = useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin

  event.res.headers.set('content-type', 'application/json; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  event.res.headers.set('access-control-allow-origin', '*')

  return openApiDocument(origin)
})
