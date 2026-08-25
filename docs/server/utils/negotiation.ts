interface AcceptEntry {
  type: string
  quality: number
}

function parseAccept(header: string | null | undefined): AcceptEntry[] {
  if (!header) {
    return []
  }
  return header.split(',').map((part) => {
    const [type, ...parameters] = part.trim().split(';')
    const q = parameters.map(parameter => /^\s*q=([\d.]+)\s*$/.exec(parameter)).find(Boolean)
    return { type: (type ?? '').trim().toLowerCase(), quality: q ? Number(q[1]) : 1 }
  }).filter(entry => entry.type)
}

function qualityOf(entries: AcceptEntry[], type: string) {
  const [group] = type.split('/')
  const match = entries.find(entry => entry.type === type)
    ?? entries.find(entry => entry.type === `${group}/*`)
    ?? entries.find(entry => entry.type === '*/*')
  return match?.quality ?? 0
}

/** Whether a request named `text/markdown` and ranked it no lower than HTML. A wildcard is not enough. */
export function prefersMarkdown(accept: string | null | undefined) {
  const entries = parseAccept(accept)
  if (!entries.some(entry => entry.type === 'text/markdown' || entry.type === 'text/x-markdown')) {
    return false
  }
  const markdown = Math.max(qualityOf(entries, 'text/markdown'), qualityOf(entries, 'text/x-markdown'))
  return markdown > 0 && markdown >= qualityOf(entries, 'text/html')
}

/** The pages with a markdown twin. */
const PROSE = new Set(['/', '/fonts', '/compare', '/api', '/about', '/contact', '/privacy'])

/** The path of a page's markdown twin, or `undefined` when it has none. */
export function markdownPath(pathname: string) {
  if (pathname.endsWith('.md')) {
    return undefined
  }

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname
  if (PROSE.has(path)) {
    return path === '/' ? '/index.md' : `${path}.md`
  }
  // `/docs` and one chapter beneath it.
  return /^\/docs(?:\/[^/]+)?$/.test(path) ? `${path}.md` : undefined
}

/** The page a markdown path belongs to: `/index.md` → `/`, `/docs/caching.md` → `/docs/caching`. */
export function pageForMarkdownPath(pathname: string) {
  if (!pathname.endsWith('.md')) {
    return undefined
  }
  return pathname === '/index.md' ? '/' : pathname.slice(0, -3)
}
