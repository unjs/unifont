import { useStorage } from 'nitro/storage'
import { openApiDocument } from './openapi'

/**
 * Markdown twins of the site's prose pages. Read from server assets, which a deployment has where
 * it has no `content/` directory.
 */

export interface MarkdownSource {
  /** Public path the markdown mirrors, without a trailing slash. */
  path: string
  title: string
  description?: string
  body: string
}

interface Frontmatter {
  data: Record<string, string>
  body: string
}

/** Handles the string scalars the content files use: `title` and `description`. */
function splitFrontmatter(raw: string): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) {
    return { data: {}, body: raw.trim() }
  }

  const data: Record<string, string> = {}
  for (const line of match[1]!.split(/\r?\n/)) {
    const pair = /^([\w-]+):\s*(.*)$/.exec(line)
    if (pair) {
      data[pair[1]!] = pair[2]!.trim().replace(/^(['"])([\s\S]*)\1$/, '$2')
    }
  }

  return { data, body: raw.slice(match[0].length).trim() }
}

/** `docs:4.resolving.md` → `/docs/resolving`, `docs:1.index.md` → `/docs`, `about.md` → `/about`. */
function pathForKey(key: string) {
  const parts = key.replace(/\.md$/, '').split(/[:/]/).map(part => part.replace(/^\d+\./, ''))
  const last = parts.pop()!
  const segments = last === 'index' ? parts : [...parts, last]
  return `/${segments.join('/')}`
}

let contentCache: MarkdownSource[] | undefined

/** Every content file, in the order the numeric filename prefixes put them in. */
async function listContent(): Promise<MarkdownSource[]> {
  if (contentCache) {
    return contentCache
  }

  const storage = useStorage('assets:content')
  const keys = (await storage.getKeys().catch(() => [] as string[]))
    .filter(key => key.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

  const files: MarkdownSource[] = []
  for (const key of keys) {
    const raw = await storage.getItem<string>(key).catch(() => null)
    if (typeof raw !== 'string') {
      continue
    }
    const { data, body } = splitFrontmatter(raw)
    const path = pathForKey(key)
    files.push({ path, title: data.title ?? path.split('/').pop()!, description: data.description, body })
  }

  if (files.length) {
    contentCache = files
  }
  return files
}

/** The documentation chapters, in reading order. */
export async function listDocs() {
  return (await listContent()).filter(file => file.path === '/docs' || file.path.startsWith('/docs/'))
}

/** The standalone prose pages: `/about`, `/contact`, `/privacy`. */
export async function listPages() {
  return (await listContent()).filter(file => !file.path.startsWith('/docs'))
}

const HOME: MarkdownSource = {
  path: '/',
  title: 'unifont: every font CDN, one lookup',
  description: 'unifont reads font metadata from Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons and npm through one interface.',
  body: [
    '`unifont` is an open-source JavaScript library for reading font metadata from font CDNs: weights, styles, subsets, unicode ranges and `@font-face` data, in the same shape for every provider. It runs in Node, Bun, Deno, workers and the browser, and it is what [`@nuxt/fonts`](https://fonts.nuxt.com) and [`fontless`](https://github.com/unjs/fontaine/tree/main/packages/fontless) use underneath.',
    '',
    'unifont.dev is the project site: a catalogue of every family the providers will list, a specimen and metadata page per family, a provider comparison, the documentation, and a public HTTP API that every page here is built on.',
    '',
    '## Install',
    '',
    '```bash',
    'npm install unifont',
    '```',
    '',
    '```ts',
    'import { createUnifont, providers } from \'unifont\'',
    '',
    'const unifont = await createUnifont([',
    '  providers.google(),',
    '  providers.fontshare(),',
    '])',
    '',
    'await unifont.getFontProperties(\'Switzer\')',
    '```',
    '',
    '## Providers',
    '',
    'Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons, npm, and Adobe Fonts (with a Typekit project id).',
    '',
    '## Where to go next',
    '',
    '- [Catalogue](/fonts): every family the providers will list, searchable and filterable by provider.',
    '- [Compare](/compare): the same family asked of every provider, side by side.',
    '- [Documentation](/docs): install it, resolve a family, cache the results, write your own provider.',
    '- [HTTP API](/api): the public endpoints behind every page, plus an MCP server at `/mcp`.',
    '- [About](/about), [Contact](/contact), [Privacy](/privacy).',
    '- [Machine-readable index](/llms.txt), [OpenAPI specification](/openapi.json), [sitemap](/sitemap.xml).',
  ].join('\n'),
}

const FONTS: MarkdownSource = {
  path: '/fonts',
  title: 'Font catalogue',
  description: 'Every font family unifont can list, across Google Fonts, Bunny Fonts, Fontshare, Fontsource and Google Icons.',
  body: [
    'Search every family the providers will list. Each family has a page with a specimen, the weights, styles and subsets the provider publishes, unicode coverage, transfer size, and `@font-face` CSS.',
    '',
    'The catalogue is the union of the provider indexes, so a family published by more than one provider appears once with every provider that carries it. Google Fonts, Bunny Fonts, Fontshare, Fontsource and Google Icons can all be listed; npm is the whole registry and Adobe Fonts needs a per-user Typekit id, so neither can be enumerated here. Search is ranked exact, then prefix, then word, then substring, and never fuzzy: a misspelt family returns nothing rather than the wrong answer.',
    '',
    'A family page lives at `/fonts/<Family%20Name>`.',
    '',
    'The same data programmatically:',
    '',
    '```bash',
    '# search',
    'curl "https://unifont.dev/api/v1/fonts?q=grotesk&limit=5"',
    '# one family',
    'curl "https://unifont.dev/api/v1/fonts/Newsreader?weights=400,600&subsets=latin"',
    '```',
    '',
    'See the [HTTP API reference](/api) or the [OpenAPI specification](/openapi.json).',
  ].join('\n'),
}

const COMPARE: MarkdownSource = {
  path: '/compare',
  title: 'Compare font providers',
  description: 'Ask every font provider for the same family and compare weights, subsets, hosts, file counts and transfer size.',
  body: [
    'Providers disagree: the same family can publish different weights, different subsets, and different file counts depending on who serves it. This page asks every provider that needs no credentials for one family and lays the answers side by side.',
    '',
    'What differs in practice: which weights exist (a provider may publish a variable axis where another ships static cuts), which subsets are available, how many files a selection resolves to, the host the files come from, the transfer size, and the fallback stack the provider suggests. A provider that does not publish the family at all is reported as unavailable rather than omitted.',
    '',
    '```bash',
    'curl https://unifont.dev/api/v1/fonts/Inter/compare',
    '```',
    '',
    'See the [HTTP API reference](/api) or the [OpenAPI specification](/openapi.json).',
  ].join('\n'),
}

interface OperationView {
  operationId: string
  description: string
  parameters?: { name: string, in: string, required?: boolean, description?: string, schema?: { type?: string | string[] } }[]
  responses?: Record<string, { description?: string }>
}

/** The API reference, written out of the OpenAPI document. */
function apiMarkdown(origin: string): MarkdownSource {
  const document = openApiDocument(origin)
  const lines: string[] = [
    'Every page on unifont.dev is a thin layer over these endpoints. They are public, they need no authentication, they are cached, and they will not change while they are under `/v1`.',
    '',
    'Machine-readable: [`/openapi.json`](/openapi.json). Not for production use: this API is best-effort and may be rate-limited or withdrawn. If a deployment of yours depends on it, run `unifont` yourself.',
    '',
  ]

  for (const [path, operations] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(operations as Record<string, OperationView>)) {
      lines.push(`## ${method.toUpperCase()} ${path}`, '')
      lines.push(`\`${operation.operationId}\`: ${operation.description}`, '')

      const parameters = operation.parameters ?? []
      if (parameters.length) {
        lines.push('| Parameter | In | Type | Required | Notes |', '| --- | --- | --- | --- | --- |')
        for (const parameter of parameters) {
          const type = Array.isArray(parameter.schema?.type) ? parameter.schema.type.join(' | ') : parameter.schema?.type ?? 'string'
          lines.push(`| \`${parameter.name}\` | ${parameter.in} | ${type} | ${parameter.required ? 'yes' : 'no'} | ${parameter.description ?? ''} |`)
        }
        lines.push('')
      }

      const responses = Object.entries(operation.responses ?? {})
      if (responses.length) {
        lines.push(...responses.map(([status, response]) => `- \`${status}\` ${response.description}`), '')
      }
    }
  }

  lines.push(
    '## Conventions',
    '',
    '- **Family names** are percent-encoded: `/api/v1/fonts/Big%20Shoulders%20Display`. Matching ignores case.',
    '- **Unknown families** return `404` with a message naming the family.',
    '- **Partial answers** name the providers that failed in `unavailable`, rather than quietly returning a short list.',
    '- **Caching**: metadata for an hour, CSS for a day, both with `stale-while-revalidate`. Font files come from the provider CDN; this API never proxies them.',
    '',
  )

  return {
    path: '/api',
    title: 'unifont.dev HTTP API',
    description: 'Every page on unifont.dev is also an HTTP endpoint: search, metadata, CSS, provider comparison and unicode coverage.',
    body: lines.join('\n'),
  }
}

/** A markdown document, with the frontmatter title and description folded into the body. */
export function renderMarkdown(source: MarkdownSource) {
  return [
    `# ${source.title}`,
    '',
    ...(source.description ? [`> ${source.description}`, ''] : []),
    source.body,
    '',
  ].join('\n')
}

/** Every page with a markdown twin. */
export async function listMarkdownSources(origin: string): Promise<MarkdownSource[]> {
  return [HOME, FONTS, COMPARE, apiMarkdown(origin), ...await listDocs(), ...await listPages()]
}

/** The markdown for a public path, or `undefined` when the path has no markdown twin. */
export async function markdownForPath(path: string, origin: string): Promise<MarkdownSource | undefined> {
  const normalised = path.length > 1 ? path.replace(/\/+$/, '') : path
  return (await listMarkdownSources(origin)).find(source => source.path === normalised)
}
