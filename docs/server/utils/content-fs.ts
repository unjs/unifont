import { fileURLToPath } from 'node:url'
import { comarkContent } from 'comark-content'
import fsSource from 'comark-content/sources/fs'

/**
 * `content/` is next to this module only when it is loaded from source. Anywhere the server has
 * been bundled the markdown is read back from a server asset instead, because a deployment has no
 * `content/` directory.
 */
export const contentDir = fileURLToPath(new URL('../../content', import.meta.url))

/**
 * The markdown as it sits on disk. Kept apart from `content.ts` so that `nuxt.config`, which reads
 * this to list the pages to prerender, does not have to load a nitro runtime import through it.
 */
export const fsContent = () => comarkContent({ source: fsSource(contentDir) })
