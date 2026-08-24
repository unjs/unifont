import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fontless } from 'fontless'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
  ],
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      bodyAttrs: { 'data-syntax-theme': 'unifont' },
      link: [
        /*
         * Two files rather than one with an embedded `prefers-color-scheme` query, which browsers
         * evaluate against the system theme rather than the theme of the tab strip. The light
         * variant is last so it wins where `media` is unsupported.
         */
        { rel: 'icon', href: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
        { rel: 'icon', href: '/favicon-light.svg', type: 'image/svg+xml' },
      ],
    },
  },
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css', '~/assets/css/syntax.css'],
  runtimeConfig: {
    public: {
      // Absolute origin for share-card URLs. Empty means "use the request origin".
      siteUrl: '',
    },
  },
  experimental: {
    typedPages: true,
  },
  compatibilityDate: '2026-08-24',
  nitro: {
    /*
     * MicroLighter loads a grammar with `import('./grammars/<language>.js')`. The specifier is not
     * statically analysable, so the client build leaves it as a runtime request for
     * `/_nuxt/grammars/<language>.js` and emits nothing to answer it.
     */
    publicAssets: [{
      dir: join(dirname(createRequire(import.meta.url).resolve('microlighter')), 'grammars'),
      baseURL: '/_nuxt/grammars',
      maxAge: 60 * 60 * 24 * 365,
    }],
    alias: {
      undici: fileURLToPath(new URL('stubs/undici.ts', import.meta.url)),
    },
    // Provider metadata is immutable enough to cache hard, and a warm cache is worth ~2s on a
    // family page.
    storage: {
      unifont: { driver: 'fs', base: 'node_modules/.cache/unifont-site' },
      // Share cards are binary, so they are cached with the raw storage API: `defineCachedHandler`
      // stringifies bodies.
      og: { driver: 'fs', base: 'node_modules/.cache/unifont-og' },
    },
    routeRules: {
      // Prerendered so the deployed site never spends one of its 60 unauthenticated GitHub
      // requests per hour on drawing a colophon.
      '/api/v1/contributors': { prerender: true },
    },
    // `unifont` is linked from the repository root, so nitro inlines it and `css-tree` with it.
    // css-tree lazily requires `../data/patch.json`, which a bundle does not emit.
    traceDeps: ['css-tree'],
  },
  vite: {
    plugins: [
      fontless({
        families: [
          // The variable cut carries Newsreader's optical-size axis.
          { name: 'Newsreader', provider: 'google', weights: ['200 800'] },
          { name: 'Switzer', provider: 'fontshare', weights: ['300', '400', '500'] },
          { name: 'JetBrains Mono', provider: 'google', weights: ['400'] },
        ],
      }),
    ],
    optimizeDeps: {
      include: ['@comark/vue', 'comark-content/client'],
      // Pre-bundling rewrites MicroLighter's dynamic grammar imports into the optimised-deps
      // cache, where the grammar files do not exist.
      exclude: ['microlighter'],
    },
  },
  typescript: {
    /*
     * `nitro/h3` re-exports h3, whose v2 exports map has no `types` condition, so which entry
     * surface TypeScript resolves varies between runs. Hoisting pins one copy for the project.
     */
    hoist: ['nitro/h3', 'h3'],
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
