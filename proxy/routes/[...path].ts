import type { CachedProxy } from '../lib/forward'
import { defineHandler, HTTPError } from 'nitro'
import { addRoute, createRouter, findRoute } from 'rou3'
import { endpoints } from '../lib/endpoints'
import { createCachedProxy, finalizeResponse } from '../lib/forward'

const router = createRouter<CachedProxy>()
for (const endpoint of endpoints) {
  addRoute(router, '', endpoint.route, createCachedProxy(endpoint))
}

export default defineHandler(async (event) => {
  // A preflight has to succeed for the CORS headers from `routeRules` to be honoured.
  if (event.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (event.req.method !== 'GET' && event.req.method !== 'HEAD') {
    throw new HTTPError({ status: 405, message: 'This proxy only serves `GET` and `HEAD` requests.' })
  }

  const matched = findRoute(router, '', event.url.pathname)
  if (!matched) {
    throw new HTTPError({ status: 404, message: `No proxy endpoint for \`${event.url.pathname}\`.` })
  }

  const response = await matched.data({ req: event.req, url: event.url, params: matched.params ?? {} })
  return finalizeResponse(response)
})
