import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { listMarkdownSources, renderMarkdown } from '../utils/markdown'

/** Every prose page on the site, concatenated into one request. */
export default defineEventHandler(async (event) => {
  const origin = (useRuntimeConfig().public.siteUrl || getRequestURL(event).origin).replace(/\/+$/, '')
  const sources = await listMarkdownSources(origin)

  const body = sources
    .map(source => `<!-- ${origin}${source.path} -->\n\n${renderMarkdown(source)}`)
    .join('\n---\n\n')

  event.res.headers.set('content-type', 'text/plain; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return `# unifont, in full\n\n> Every prose page on unifont.dev, concatenated. The machine-readable index is at ${origin}/llms.txt and the API description at ${origin}/openapi.json.\n\n${body}`
})
