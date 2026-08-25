import type { H3Event } from 'nitro/h3'
import { definePlugin } from 'nitro'
import { markdownPath, prefersMarkdown } from '#server/utils/negotiation'

/**
 * `Accept: text/markdown` is answered with the page's markdown twin, per
 * <https://acceptmarkdown.com>. The rewrite runs on the `request` hook, which is the only point
 * ahead of the static handler that serves the prerendered `.md` file.
 */
export default definePlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    if (event.req.method !== 'GET' && event.req.method !== 'HEAD') {
      return
    }

    // Nitro types the hook with the minimal `HTTPEvent`, the request and nothing else. What it
    // dispatches is an `H3Event`, whose `url` is the one routing and the static handler read.
    const { url, res } = event as H3Event

    const twin = markdownPath(url.pathname)
    if (!twin) {
      return
    }

    // On the HTML variant too: a shared cache must not serve it to a client asking for markdown.
    res.headers.set('vary', 'Accept, Accept-Encoding')

    if (prefersMarkdown(event.req.headers.get('accept'))) {
      url.pathname = twin
    }
  })
})
