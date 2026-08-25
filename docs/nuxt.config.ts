import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fontless } from 'fontless'

/**
 * Documentation slugs, read from the content directory at build time. `1.index.md` is the root of
 * the section; every other file keeps its name without the ordering prefix.
 */
const docSlugs = readdirSync(fileURLToPath(new URL('content', import.meta.url)))
  .filter(name => name.endsWith('.md'))
  .map(name => name.replace(/^\d+\./, '').replace(/\.md$/, ''))
  .map(slug => (slug === 'index' ? '' : slug))

/**
 * The pages and the content endpoints behind them, prerendered so no request has to read markdown
 * from a filesystem that a serverless deployment does not have.
 */
const docRoutes = [
  '/docs',
  ...docSlugs.filter(Boolean).map(slug => `/docs/${slug}`),
  '/api/content/navigation',
  ...docSlugs.map(slug => `/api/content/get/${slug}`),
]

/**
 * Where the font caches live. `node_modules` is convenient in development but read-only on most
 * deployment platforms, where the temporary directory is the one writable path.
 */
const cacheBase = process.env.UNIFONT_SITE_CACHE_DIR
  ?? (process.env.NODE_ENV === 'production' ? tmpdir() : 'node_modules/.cache')

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
      siteUrl: 'https://unifont.dev',
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
    // Provider family indexes, fetched by `scripts/prime-font-cache.mjs` before the build and read
    // back through the `unifont` storage.
    serverAssets: [{ baseName: 'font-cache', dir: './.font-cache' }],
    // Provider metadata is immutable enough to cache hard, and a warm cache is worth ~2s on a
    // family page.
    storage: {
      unifont: { driver: 'fs', base: join(cacheBase, 'unifont-site') },
      // Share cards are binary, so they are cached with the raw storage API: `defineCachedHandler`
      // stringifies bodies.
      og: { driver: 'fs', base: join(cacheBase, 'unifont-og') },
    },
    routeRules: {
      // Prerendered so the deployed site never spends one of its 60 unauthenticated GitHub
      // requests per hour on drawing a colophon.
      '/api/v1/contributors': { prerender: true },
    },
    prerender: {
      routes: docRoutes,
      // The docs pages are listed explicitly, and crawling them would pull in every family page.
      crawlLinks: false,
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
    hoist: ['nitro/h3', 'h3'],
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
