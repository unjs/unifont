import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { markdownForPath, renderMarkdown } from '../utils/markdown'
import { pageForMarkdownPath } from '../utils/negotiation'

/**
 * `<path>.md` for any prose page, per <https://acceptmarkdown.com>. Reached in development and
 * for any page the build did not prerender; `Accept` negotiation lives in
 * `server/plugins/markdown-negotiation.ts`.
 */
export default defineEventHandler(async (event) => {
  if (event.req.method !== 'GET' && event.req.method !== 'HEAD') {
    return
  }

  const url = getRequestURL(event)
  const path = pageForMarkdownPath(url.pathname)
  if (!path) {
    return
  }

  const origin = useRuntimeConfig().public.siteUrl || url.origin
  const source = await markdownForPath(path, origin)
  if (!source) {
    return
  }

  event.res.headers.set('content-type', 'text/markdown; charset=utf-8')
  event.res.headers.set('vary', 'Accept, Accept-Encoding')
  event.res.headers.set('cache-control', 'public, max-age=600, stale-while-revalidate=86400')
  event.res.headers.set('link', `<${new URL(source.path, origin).href}>; rel="canonical"`)
  return renderMarkdown(source)
})
