import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Driver } from 'unstorage'
import { comarkContent } from 'comark-content'
import fsSource from 'comark-content/sources/fs'
import unstorageSource from 'comark-content/sources/unstorage'
import { useStorage } from 'nitro/storage'

/**
 * `content/` is next to this module only when it is loaded from source, which is how
 * `nuxt.config.ts` lists the pages to prerender before nitro exists. Anywhere the server has been
 * bundled the markdown is read back from the `content` server asset instead, because a deployment
 * has no `content/` directory.
 */
const contentDir = fileURLToPath(new URL('../../content', import.meta.url))

/** The `content` server asset, as the driver `unstorageSource` wants rather than a `Storage`. */
function assetDriver(): Driver {
  const storage = useStorage('assets:content')
  return {
    name: 'server-assets',
    options: {},
    getKeys: () => storage.getKeys(),
    hasItem: key => storage.hasItem(key),
    getItem: key => storage.getItem(key),
  }
}

const source = existsSync(contentDir) ? fsSource(contentDir) : unstorageSource({ driver: assetDriver() })

export const content = comarkContent({ source })
