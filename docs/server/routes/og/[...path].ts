import { defineEventHandler, getQuery, getRouterParam, setResponseHeader } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { renderOgCard } from '../../utils/og'

/**
 * Share cards, rendered by takumi with fonts resolved through unifont, so a font's card is set in
 * that font: `/og/fonts/Fraunces.png`, `/og/docs/caching.png`, `/og/index.png`.
 *
 * The `.png` lives in the path rather than the filename because nitro folds a literal suffix into
 * the parameter name (`[...path].png` yields a `path.png` param).
 */
export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'path') || ''
  const path = raw.replace(/\.png$/, '').replace(/^\/+|\/+$/g, '')
  const query = getQuery(event)
  const title = typeof query.title === 'string' ? query.title.trim() : undefined

  setResponseHeader(event, 'content-type', 'image/png')
  setResponseHeader(event, 'cache-control', 'public, max-age=86400, stale-while-revalidate=604800')

  // Cached by hand: `defineCachedHandler` round-trips the body through storage as a string, which
  // corrupts the PNG.
  const cache = useStorage('og')
  const key = `${path || 'index'}${title ? `--${title}` : ''}`.replace(/[^a-z0-9]+/gi, '_')

  const cached = await cache.getItemRaw<Uint8Array>(key)
  if (cached) {
    return cached
  }

  const png = await renderOgCard(path, title)
  await cache.setItemRaw(key, png)
  return png
})
