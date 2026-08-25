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

    const twin = markdownPath(event.url.pathname)
    if (!twin) {
      return
    }

    // On the HTML variant too: a shared cache must not serve it to a client asking for markdown.
    event.res.headers.set('vary', 'Accept, Accept-Encoding')

    if (prefersMarkdown(event.req.headers.get('accept'))) {
      event.url.pathname = twin
    }
  })
})
