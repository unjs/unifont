import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

/** Everything here is public; the file exists to point at the machine-readable indexes. */
export default defineEventHandler((event) => {
  const origin = (useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin).replace(/\/+$/, '')

  event.res.headers.set('content-type', 'text/plain; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=86400')

  return [
    'User-agent: *',
    'Allow: /',
    // Share cards are generated per route and are not content.
    'Disallow: /og/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
    `# Agents: start at ${origin}/llms.txt`,
    `# API description: ${origin}/openapi.json`,
    `# MCP server: ${origin}/mcp`,
    '',
  ].join('\n')
})
