import { defineEventHandler, getRequestURL } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { listDocs, listPages } from '../utils/markdown'

/**
 * The index an agent reads first, in the format described at <https://llmstxt.org>: an H1, a
 * blockquote summary, prose, then H2 sections of annotated links.
 */
export default defineEventHandler(async (event) => {
  const origin = (useRuntimeConfig().public.siteUrl || getRequestURL(event).origin).replace(/\/+$/, '')
  const url = (path: string) => `${origin}${path}`

  const docs = await listDocs()
  const pages = await listPages()

  const lines = [
    '# unifont',
    '',
    '> unifont reads font metadata from every major font CDN through one interface: Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons, npm and Adobe Fonts. It is an MIT-licensed JavaScript library, and unifont.dev is its project site, catalogue and public HTTP API.',
    '',
    'Every page on unifont.dev is also an endpoint. Ask for `text/markdown` (or append `.md` to a path) and any prose page answers in markdown. The API is described by an OpenAPI document, and there is an MCP server for agents that would rather call tools than URLs.',
    '',
    '## When to use this',
    '',
    'Reach for unifont.dev when the question is about a **web font that is published on a CDN**. Specifically:',
    '',
    '- **"Does family X exist, and where can I get it?"** Search the merged catalogue of every family the providers will list: `GET /api/v1/fonts?q=<query>`. Never fuzzy, so a miss means the name is wrong.',
    '- **"What weights, styles and subsets does family X actually publish?"** `GET /api/v1/fonts/<family>`. Returns provider metadata plus the resolved `@font-face` data, so you do not have to guess whether a weight exists before you ship CSS referencing it.',
    '- **"Give me `@font-face` CSS for these families."** `GET /api/v1/fonts/<family>/css`, or `GET /api/v1/css?families=A,B,C` for a batch. The output is servable as-is and includes a metric-matched fallback where one can be built.',
    '- **"Which provider should I load this family from?"** `GET /api/v1/fonts/<family>/compare` asks every credential-free provider the same question and shows where the answers differ (weights, subsets, hosts, file counts, bytes).',
    '- **"Can this font draw this text?"** `GET /api/v1/fonts/<family>/coverage?text=…` checks the resolved `unicode-range`s, which is how you catch a family that silently cannot set Polish, Vietnamese or Greek.',
    '- **"How heavy is this selection?"** `GET /api/v1/fonts/<family>/transfer` measures the real files with `HEAD` requests. Nothing is downloaded.',
    '- **"How do I do this in my own build?"** Read the library documentation below. For a Vite or Nuxt app, the answer is usually `fontless` or `@nuxt/fonts`, both of which wrap unifont.',
    '',
    'Do not use it for: hosting or serving font binaries (font files always come from the provider CDN), licensing decisions, font subsetting, or families that are not on a public CDN. Adobe Fonts needs a per-user Typekit id, so this site cannot answer for it.',
    '',
    'How to call it: plain HTTP `GET`, no authentication, no key, JSON by default. Percent-encode family names. Prefer the MCP server (`POST /mcp`, Streamable HTTP) if your runtime speaks it: the tools are `search_fonts`, `get_font`, `get_font_css`, `compare_providers`, `check_coverage` and `list_providers`. Treat this as best-effort infrastructure and cache what you fetch; if a production deployment depends on it, install `unifont` and run it yourself.',
    '',
    '## Machine-readable',
    '',
    `- [OpenAPI specification](${url('/openapi.json')}): every endpoint, with operation ids, typed parameters and response schemas.`,
    `- [MCP server](${url('/mcp')}): Model Context Protocol over Streamable HTTP. \`claude mcp add --transport http unifont ${url('/mcp')}\`.`,
    `- [Sitemap](${url('/sitemap.xml')}): every indexable URL.`,
    `- [Full documentation as one file](${url('/llms-full.txt')}): every documentation page, concatenated.`,
    `- [Service status](${url('/api/v1/status')}): family counts, which providers answered, index age.`,
    `- [Providers](${url('/api/v1/providers')}): every provider, with the number of families it lists.`,
    '',
    '## Documentation',
    '',
    ...docs.map(doc => `- [${doc.title}](${url(`${doc.path}.md`)})${doc.description ? `: ${doc.description}` : ''}`),
    '',
    '## Site',
    '',
    `- [Home](${url('/index.md')}): what unifont is, and how to install it.`,
    `- [HTTP API reference](${url('/api.md')}): the endpoints behind every page on the site.`,
    `- [Catalogue](${url('/fonts.md')}): every family the providers will list.`,
    `- [Compare providers](${url('/compare.md')}): the same family, asked of every provider.`,
    ...pages.map(page => `- [${page.title}](${url(`${page.path}.md`)})${page.description ? `: ${page.description}` : ''}`),
    '',
    '## Optional',
    '',
    '- [Source on GitHub](https://github.com/unjs/unifont): the library, the site and the CORS proxy.',
    '- [unifont on npm](https://www.npmjs.com/package/unifont): `npm install unifont`.',
    '- [@nuxt/fonts](https://fonts.nuxt.com): zero-config fonts for Nuxt, built on unifont.',
    '- [fontless](https://github.com/unjs/fontaine/tree/main/packages/fontless): the same for any Vite app.',
    '',
  ]

  event.res.headers.set('content-type', 'text/plain; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return lines.join('\n')
})
