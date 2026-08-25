/**
 * Fetches every provider's family index at build time and writes it to `.font-cache`, which nitro
 * bundles as a server asset. A deployed instance then reads the indexes from its own bundle
 * instead of calling four provider APIs on its first request.
 *
 * The cache entries carry `unifont`'s own key and expiry format, so a stale bundle simply expires
 * and the runtime refetches.
 */
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import fsDriver from 'unstorage/drivers/fs'
import { createStorage } from 'unstorage'
import { createUnifont, providers } from 'unifont'

const PROVIDERS = ['google', 'bunny', 'fontshare', 'fontsource', 'googleicons']

const base = fileURLToPath(new URL('../.font-cache', import.meta.url))

await rm(base, { recursive: true, force: true })
await mkdir(base, { recursive: true })

const storage = createStorage({ driver: fsDriver({ base }) })

const unifont = await createUnifont(PROVIDERS.map(name => providers[name]()), {
  storage: {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
  },
})

const families = await unifont.listFonts()

if (!families?.length) {
  // A build that bakes in an empty index would ship a site with an empty catalogue.
  console.error('Primed no families. Refusing to write an empty font cache.')
  process.exitCode = 1
}
else {
  console.log(`Primed ${families.length} families from ${PROVIDERS.length} providers.`)
}
