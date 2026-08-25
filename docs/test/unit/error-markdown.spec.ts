import { describe, expect, it } from 'vitest'
import { errorMarkdown, wantsMarkdownError } from '../../server/utils/error-markdown'

const BROWSER = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8'

describe('wantsMarkdownError', () => {
  it('should answer a browser with the rendered error page', () => {
    expect(wantsMarkdownError('/nope', BROWSER)).toBe(false)
  })

  it('should answer a client that asked for markdown, or asked for nothing in particular', () => {
    expect(wantsMarkdownError('/nope', 'text/markdown')).toBe(true)
    expect(wantsMarkdownError('/nope', '*/*')).toBe(true)
    expect(wantsMarkdownError('/nope', null)).toBe(true)
    expect(wantsMarkdownError('/nope.md', BROWSER)).toBe(true)
  })

  it('should leave the endpoints to answer in their own format', () => {
    for (const path of ['/api/v1/fonts/Nope', '/api/content/get/nope', '/mcp', '/og/nope.png']) {
      expect(wantsMarkdownError(path, '*/*'), path).toBe(false)
    }
  })
})

describe('errorMarkdown', () => {
  it('should name the path and point at the machine-readable indexes', () => {
    const body = errorMarkdown(404, '/nope')
    expect(body.startsWith('# 404: nothing at `/nope`')).toBe(true)
    for (const link of ['/llms.txt', '/sitemap.xml', '/openapi.json', '/docs', '/api']) {
      expect(body).toContain(`](${link})`)
    }
    expect(body).toContain('GET /api/v1/fonts?q=')
  })

  it('should treat a 410 as gone but recoverable', () => {
    expect(errorMarkdown(410, '/gone').startsWith('# 410: nothing at `/gone`')).toBe(true)
  })

  it('should point a server error at the status endpoint', () => {
    const body = errorMarkdown(503, '/fonts/Inter', 'Service Unavailable')
    expect(body.startsWith('# 503: Service Unavailable')).toBe(true)
    expect(body).toContain('/api/v1/status')
  })
})
