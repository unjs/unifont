import { defineErrorHandler } from 'nitro'
import { errorMarkdown, wantsMarkdownError } from './utils/error-markdown'

/** Failures an agent can recover from: the same status, with a markdown body naming where to look next. */
export default defineErrorHandler((error, event) => {
  const url = new URL(event.req.url)
  if (!wantsMarkdownError(url.pathname, event.req.headers.get('accept'))) {
    return
  }

  const status = error.status ?? 500

  return new Response(errorMarkdown(status, url.pathname, error.statusText), {
    status,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'vary': 'Accept, Accept-Encoding',
      'cache-control': 'no-store',
      // Nothing here is a secret, and an agent may be calling from a page.
      'access-control-allow-origin': '*',
    },
  })
})
