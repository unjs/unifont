import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

/** The server asset the build fills from `content/`, keyed as unstorage keys it. */
vi.mock('nitro/storage', () => {
  const root = fileURLToPath(new URL('../../content', import.meta.url))

  const walk = (directory: string, prefix = ''): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory()
        ? walk(`${directory}/${entry.name}`, `${prefix}${entry.name}:`)
        : [`${prefix}${entry.name}`],
    )

  return {
    useStorage: (base: string) => ({
      getKeys: async () => (base === 'assets:content' ? walk(root) : []),
      getItem: async (key: string) => readFileSync(`${root}/${key.replace(/:/g, '/')}`, 'utf8'),
    }),
  }
})

const { listDocs, listPages, listMarkdownSources, markdownForPath, renderMarkdown } = await import('../../server/utils/markdown')
const { markdownPath, pageForMarkdownPath, prefersMarkdown } = await import('../../server/utils/negotiation')

describe('prefersMarkdown', () => {
  it('should be true when markdown is named and ranked no lower than HTML', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true)
    expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true)
    expect(prefersMarkdown('text/x-markdown;q=1.0')).toBe(true)
    expect(prefersMarkdown('text/html;q=0.5, text/markdown;q=0.8')).toBe(true)
  })

  it('should be false for a browser, a bare wildcard, or markdown ranked below HTML', () => {
    expect(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(false)
    expect(prefersMarkdown('*/*')).toBe(false)
    expect(prefersMarkdown('text/*')).toBe(false)
    expect(prefersMarkdown('text/markdown;q=0.2, text/html')).toBe(false)
    expect(prefersMarkdown(null)).toBe(false)
    expect(prefersMarkdown('')).toBe(false)
  })
})

describe('markdownPath', () => {
  it('should map a prose page to its twin', () => {
    expect(markdownPath('/')).toBe('/index.md')
    expect(markdownPath('/about')).toBe('/about.md')
    expect(markdownPath('/docs')).toBe('/docs.md')
    expect(markdownPath('/docs/')).toBe('/docs.md')
    expect(markdownPath('/docs/caching')).toBe('/docs/caching.md')
  })

  it('should leave everything that is not prose alone', () => {
    for (const path of ['/fonts/Newsreader', '/api/v1/status', '/openapi.json', '/og/index.png', '/index.md', '/docs/a/b']) {
      expect(markdownPath(path), path).toBeUndefined()
    }
  })
})

describe('pageForMarkdownPath', () => {
  it('should invert markdownPath', () => {
    for (const path of ['/', '/about', '/docs', '/docs/caching']) {
      expect(pageForMarkdownPath(markdownPath(path)!), path).toBe(path)
    }
  })

  it('should ignore a path that is not markdown', () => {
    expect(pageForMarkdownPath('/about')).toBeUndefined()
  })
})

describe('listDocs', () => {
  it('should map every content file to its docs path, in chapter order', async () => {
    const docs = await listDocs()
    expect(docs.length).toBeGreaterThan(5)
    expect(docs[0]!.path).toBe('/docs')
    expect(docs[0]!.title).toBe('Introduction')
    expect(docs.map(doc => doc.path)).toContain('/docs/resolving')
    expect(docs.every(doc => doc.body.length > 100)).toBe(true)
  })

  it('should strip frontmatter from the body and keep its title and description', async () => {
    const doc = (await listDocs()).find(doc => doc.path === '/docs/providers')!
    expect(doc.description).toBeTruthy()
    expect(doc.body.startsWith('---')).toBe(false)
  })
})

describe('listPages', () => {
  it('should expose the trust pages with enough prose to be useful', async () => {
    const pages = await listPages()
    expect(pages.map(page => page.path)).toEqual(['/about', '/contact', '/privacy'])
    for (const page of pages) {
      expect(page.title, page.path).toBeTruthy()
      expect(page.description, page.path).toBeTruthy()
      expect(page.body.length, page.path).toBeGreaterThan(1500)
    }
  })
})

describe('markdownForPath', () => {
  const origin = 'https://unifont.dev'

  it('should answer for the home page, the catalogue, compare and the API', async () => {
    for (const path of ['/', '/fonts', '/compare', '/api']) {
      const source = await markdownForPath(path, origin)
      expect(source, path).toBeTruthy()
      expect(source!.body.length, path).toBeGreaterThan(500)
    }
  })

  it('should build the API reference out of the OpenAPI document', async () => {
    const source = (await markdownForPath('/api', origin))!
    expect(source.body).toContain('## GET /api/v1/fonts/{family}')
    expect(source.body).toContain('`searchFonts`')
    expect(source.body).toContain('| `q` | query | string | no |')
    expect(source.body).toContain('- `404`')
  })

  it('should answer for docs and trust pages, ignoring a trailing slash', async () => {
    expect(await markdownForPath('/docs/caching', origin)).toBeTruthy()
    expect(await markdownForPath('/docs/caching/', origin)).toBeTruthy()
    expect(await markdownForPath('/privacy', origin)).toBeTruthy()
  })

  it('should not invent markdown for a path that has none', async () => {
    expect(await markdownForPath('/fonts/Newsreader', origin)).toBeUndefined()
    expect(await markdownForPath('/nope', origin)).toBeUndefined()
  })
})

describe('renderMarkdown', () => {
  it('should lead with an H1 and a blockquote summary', () => {
    const rendered = renderMarkdown({ path: '/x', title: 'Title', description: 'Summary.', body: 'Body.' })
    expect(rendered).toBe('# Title\n\n> Summary.\n\nBody.\n')
  })

  it('should omit the blockquote when there is no description', () => {
    expect(renderMarkdown({ path: '/x', title: 'Title', body: 'Body.' })).toBe('# Title\n\nBody.\n')
  })
})

describe('listMarkdownSources', () => {
  it('should give every source a unique path and an H1 when rendered', async () => {
    const sources = await listMarkdownSources('https://unifont.dev')
    expect(new Set(sources.map(source => source.path)).size).toBe(sources.length)
    for (const source of sources) {
      expect(renderMarkdown(source).startsWith('# '), source.path).toBe(true)
    }
  })
})
