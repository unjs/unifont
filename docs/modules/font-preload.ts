import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'

/**
 * Preloads the faces the interface is set in, through the client manifest.
 *
 * They are self-hosted under a content hash, so nothing knows their URLs until the client bundle
 * is generated, and they appear only inside the entry stylesheet, two round trips ahead of the
 * first line of text. `fontless` has a `preload` option, but it emits through
 * `transformIndexHtml`, which a server-rendered app never runs.
 */
const FAMILIES = ['Newsreader', 'Switzer', 'JetBrains Mono']

/** Upright only: italic is rare enough on a given page to be worth a late request. */
function uprightFontFiles(css: string) {
  const files: string[] = []
  for (const [, block] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const declared = /font-family:\s*(?:"([^"]*)"|'([^']*)'|([^;}]*))/.exec(block!)
    const family = (declared?.[1] ?? declared?.[2] ?? declared?.[3] ?? '').trim()
    if (!FAMILIES.includes(family) || /font-style:\s*italic/.test(block!)) {
      continue
    }
    const url = /url\(\s*["']?([^"')]+\.woff2)/.exec(block!)?.[1]
    if (url) {
      files.push(url.replace(/^\/_nuxt\//, ''))
    }
  }
  return files
}

export default defineNuxtModule({
  meta: { name: 'font-preload' },
  setup(_options, nuxt) {
    const files = new Set<string>()

    addVitePlugin({
      name: 'font-preload',
      applyToEnvironment: environment => environment.name === 'client',
      generateBundle(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type === 'asset' && asset.fileName.endsWith('.css')) {
            for (const file of uprightFontFiles(String(asset.source))) {
              files.add(file)
            }
          }
        }
      },
    })

    // The client bundle is generated before the manifest is written, so the faces are known here.
    nuxt.hook('build:manifest', (manifest) => {
      const entry = Object.values(manifest).find(chunk => chunk.isEntry)
      if (!entry) {
        return
      }
      for (const file of files) {
        manifest[file] = { file, resourceType: 'font', mimeType: 'font/woff2', preload: true, prefetch: false }
        entry.assets = [...(entry.assets ?? []), file]
      }
    })
  },
})
