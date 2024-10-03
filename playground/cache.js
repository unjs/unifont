// @ts-check
// custom caching support

import { createUnifont, providers } from 'unifont'

import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'

const storage = createStorage({
  driver: fsDriver({ base: 'node_modules/.cache/unifont' }),
})

const cachedUnifont = await createUnifont([providers.google()], { storage })

console.log(await cachedUnifont.resolveFontFace('Poppins'))
