import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fontless } from 'fontless'
import { FEATURED_FAMILIES, specimenGlyphs } from './shared/featured.ts'

/** The families the interface is set in, resolved in full rather than to a glyph list. */
const INTERFACE_FAMILIES = ['Newsreader', 'Switzer', 'JetBrains Mono']

/** Routes whose answer depends on nothing about the request. */
const staticRoutes = [
  '/',
  '/fonts',
  '/compare',
  '/api',
  '/api/v1/catalogue.css',
  '/api/v1/specimens.css',
  '/api/content/navigation',
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
  features: {
    // Global CSS as well as component styles: it carries the interface's `@font-face` rules, so a
    // link to it costs a round trip before the browser can discover a single font file.
    inlineStyles: true,
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
      // `defineCachedFunction` writes here, and the default base is not writable on a deployment.
      cache: { driver: 'fs', base: join(cacheBase, 'unifont-cache') },
      unifont: { driver: 'fs', base: join(cacheBase, 'unifont-site') },
      // Share cards are binary, so they are cached with the raw storage API: `defineCachedHandler`
      // stringifies bodies.
      og: { driver: 'fs', base: join(cacheBase, 'unifont-og') },
    },
    routeRules: {
      // Prerendered so the deployed site never spends one of its 60 unauthenticated GitHub
      // requests per hour on drawing a colophon.
      '/api/v1/contributors': { prerender: true },
      '/api/v1/specimens.css': { headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } },
      '/api/v1/catalogue.css': { headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } },
    },
    prerender: {
      routes: staticRoutes,
      // Crawling would pull in a family page per specimen.
      crawlLinks: false,
    },
    // `unifont` is linked from the repository root, so nitro inlines it and `css-tree` with it.
    // css-tree lazily requires `../data/patch.json`, which a bundle does not emit.
    traceDeps: ['css-tree'],
  },
  vite: {
    plugins: [
      fontless({
        /*
         * One file per family and style, and preloaded: every page sets its first paragraph in
         * these. `fontaine`'s metric fallback cannot cover a swap here, because `local("serif")`
         * matches no installed family and the face never loads.
         *
         * The interface is in English, so `latin` is the whole of it.
         */
        families: [
          // The variable cut carries Newsreader's optical-size axis.
          { name: 'Newsreader', provider: 'google', weights: ['200 800'], styles: ['normal'], subsets: ['latin'], preload: true },
          // The variable cut, so the 350 and 450 body weights are real rather than rounded.
          { name: 'Switzer', provider: 'fontshare', weights: ['100 900'], styles: ['normal', 'italic'], subsets: ['latin'], preload: true },
          { name: 'JetBrains Mono', provider: 'google', weights: ['400'], styles: ['normal'], subsets: ['latin'], preload: true },
          /*
           * The front page's specimens. The grid is fixed, so the faces belong in the build rather
           * than behind a provider stylesheet. `glyphs` is the specimen text and the family's own
           * name, which Google will subset to; no fallback, because `local()` matches nothing here
           * and each one costs five more `@font-face` rules.
           */
          ...FEATURED_FAMILIES
            .filter(name => !INTERFACE_FAMILIES.includes(name))
            .map(name => ({
              name,
              preload: false,
              fallbacks: [],
              weights: ['400'],
              styles: ['normal' as const],
              subsets: ['latin'],
              providerOptions: { google: { experimental: { glyphs: specimenGlyphs(name) } } },
            })),
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
  hooks: {
    // The documentation pages and the endpoints behind them, so no request has to read markdown
    // from a filesystem a serverless deployment does not have.
    'prerender:routes': async ({ routes }) => {
      const { content } = await import('./server/utils/content.ts')
      for (const { path } of await content.list()) {
        const slug = path === '/' ? '' : path.replace(/^\//, '')
        routes.add(`/docs${slug ? `/${slug}` : ''}`)
        routes.add(`/api/content/get/${slug}`)
      }
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
