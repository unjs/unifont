import { cp, readdir, rm } from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  hooks: {
    'rollup:done': async function () {
      // default to .js and .d.ts extensions
      for (const file of await readdir('dist')) {
        if (file.endsWith('.mjs') || file.endsWith('.d.mts')) {
          await cp(`dist/${file}`, `dist/${file.replace('.mjs', '.js').replace('.d.mts', '.d.ts')}`)
          await rm(`dist/${file}`)
        }
      }
    },
  },
})
