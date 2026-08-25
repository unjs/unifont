import { FEATURED_FAMILIES } from '#shared/featured'
import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { listDocs, listPages } from '../utils/markdown'

interface Entry {
  path: string
  priority: string
  changefreq: string
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Every indexable URL. A family page costs a provider lookup, so only the featured ones are listed. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const origin = (config.public.siteUrl || getRequestURL(event).origin).replace(/\/+$/, '')
  const lastmod = config.buildTime || new Date().toISOString()

  const entries: Entry[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/fonts', priority: '0.9', changefreq: 'daily' },
    { path: '/compare', priority: '0.8', changefreq: 'weekly' },
    { path: '/api', priority: '0.8', changefreq: 'weekly' },
    ...(await listDocs()).map(doc => ({ path: doc.path, priority: '0.7', changefreq: 'weekly' })),
    ...(await listPages()).map(page => ({ path: page.path, priority: '0.4', changefreq: 'yearly' })),
    ...FEATURED_FAMILIES.map(family => ({
      path: `/fonts/${encodeURIComponent(family)}`,
      priority: '0.6',
      changefreq: 'monthly',
    })),
  ]

  const urls = entries.map(entry => [
    '  <url>',
    `    <loc>${escape(`${origin}${entry.path}`)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n'))

  event.res.headers.set('content-type', 'application/xml; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
