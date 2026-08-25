import { createHash } from 'node:crypto'
import { defineEventHandler, getQuery, getRouterParam } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { renderOgCard } from '../../utils/og'

/** A title longer than a card can show is a cache-filling attempt, not a share card. */
const TITLE_LIMIT = 120

/** Cached cards expire, so an unbounded set of titles cannot pin storage forever. */
const TTL = 7 * 24 * 60 * 60 * 1000

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
  const title = typeof query.title === 'string' ? query.title.trim().slice(0, TITLE_LIMIT) : undefined

  event.res.headers.set('content-type', 'image/png')
  event.res.headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800')

  // Cached by hand: `defineCachedHandler` round-trips the body through storage as a string, which
  // corrupts the PNG.
  const cache = useStorage('og')
  // Hashed rather than slugified: `A/B` and `A_B` are different cards and must not collide.
  const key = createHash('sha256').update(`${path || 'index'}\u0000${title ?? ''}`).digest('hex')

  // Written by hand rather than read from driver metadata, which not every driver reports.
  const meta = await Promise.resolve(cache.getMeta(key)).catch(() => null)
  const expiresAt = Number(meta && 'expiresAt' in meta ? meta.expiresAt : 0) || 0
  if (expiresAt > Date.now()) {
    const cached = await cache.getItemRaw<Uint8Array>(key)
    if (cached) {
      return cached
    }
  }

  const png = await renderOgCard(path, title)
  await cache.setItemRaw(key, png)
  await Promise.resolve(cache.setMeta(key, { expiresAt: Date.now() + TTL })).catch(() => {})
  return png
})
