import { existsSync } from 'node:fs'
import type { Driver } from 'unstorage'
import { comarkContent } from 'comark-content'
import unstorageSource from 'comark-content/sources/unstorage'
import { useStorage } from 'nitro/storage'
import { contentDir, fsContent } from './content-fs'

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

export const content = existsSync(contentDir)
  ? fsContent()
  : comarkContent({ source: unstorageSource({ driver: assetDriver() }) })
