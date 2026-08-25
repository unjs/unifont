import { prefersMarkdown } from './negotiation'

/** Endpoints answer in their own format, whatever went wrong. */
const OPAQUE = /^\/(?:api\/|mcp$|og\/)/

/**
 * Whether a failed request should be answered in markdown: it asked for markdown, asked for a
 * `.md` path, or never mentioned HTML. Anything asking for HTML gets the rendered error page.
 */
export function wantsMarkdownError(pathname: string, accept: string | null | undefined) {
  if (OPAQUE.test(pathname)) {
    return false
  }
  if (pathname.endsWith('.md') || prefersMarkdown(accept)) {
    return true
  }
  return !accept?.includes('text/html')
}

/** What happened, and where to look next. */
export function errorMarkdown(status: number, pathname: string, statusText?: string) {
  if (status === 404 || status === 410) {
    return [
      `# ${status}: nothing at \`${pathname}\``,
      '',
      '> unifont.dev has no document at this path. Nothing was moved; the path does not exist.',
      '',
      '## Where to look instead',
      '',
      '- [/llms.txt](/llms.txt): the machine-readable index of this site, including when to use it.',
      '- [/sitemap.xml](/sitemap.xml): every indexable URL.',
      '- [/openapi.json](/openapi.json): the API description, with every endpoint and its parameters.',
      '- [/docs](/docs): the documentation index. Append `.md` to any page for markdown.',
      '- [/api](/api): the HTTP API reference.',
      '',
      '## Looking for a font family?',
      '',
      'Family pages live at `/fonts/<Family%20Name>`, and search is `GET /api/v1/fonts?q=<query>`. Matching ignores case but is never fuzzy, so a misspelt family returns nothing rather than a near miss.',
      '',
    ].join('\n')
  }

  return [
    `# ${status}: ${statusText || 'request failed'}`,
    '',
    '> Something on unifont.dev, or a font provider behind it, failed part way through. Retrying usually works.',
    '',
    '- Current service state: [/api/v1/status](/api/v1/status)',
    '- Machine-readable index: [/llms.txt](/llms.txt)',
    '',
  ].join('\n')
}
