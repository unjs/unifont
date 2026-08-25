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
  '/about',
  '/contact',
  '/privacy',
  '/api/v1/catalogue.css',
  '/api/v1/specimens.css',
  '/api/content/navigation',
  // Machine-readable descriptions of the site: their answers depend on the content, not the request.
  '/openapi.json',
  '/api/openapi.json',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
]

/** Pages with a markdown twin, served at `<path>.md`. `/docs` also has one chapter beneath it. */
const proseRoutes = ['/', '/fonts', '/compare', '/api', '/about', '/contact', '/privacy', '/docs']

const negotiatedRoutes = [...proseRoutes, '/docs/**']

const markdownTwin = (route: string) => (route === '/' ? '/index.md' : `${route}.md`)

/**
 * Markdown negotiation for the prerendered pages, whose static files Vercel's CDN serves before
 * any function of ours runs, so the rewrite has to happen in the routing layer.
 */
const vercelMarkdownRoutes = [
  ...proseRoutes.map(route => ({ src: route, dest: markdownTwin(route) })),
  { src: '/docs/([^/]+)', dest: '/docs/$1.md' },
].map(route => ({
  ...route,
  has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
  headers: { vary: 'Accept, Accept-Encoding' },
}))

/** The facets a family can be narrowed by, which a cache of one has to key on. */
const familyFacets = ['weights', 'subsets', 'styles', 'provider']

/** A day: a family's faces change when a provider republishes it, and a deployment resets this. */
const DAY = 60 * 60 * 24

const familyPage = { expiration: DAY, allowQuery: familyFacets }

// The endpoint answers in a format as well, which the page does not ask about.
const familyEntry = { expiration: DAY, allowQuery: [...familyFacets, 'formats'] }

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
    // `lastmod` in `sitemap.xml`: the prose ships with the build.
    buildTime: new Date().toISOString(),
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
    /*
     * Provider family indexes, fetched by `scripts/prime-font-cache.mjs` before the build and read
     * back through the `unifont` storage, and the markdown behind every prose page, since a
     * deployment has no `content/` directory.
     */
    serverAssets: [
      { baseName: 'font-cache', dir: './.font-cache' },
      { baseName: 'content', dir: './content' },
    ],
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
    vercel: {
      config: { version: 3, routes: vercelMarkdownRoutes },
    },
    routeRules: {
      // Prerendered so the deployed site never spends one of its 60 unauthenticated GitHub
      // requests per hour on drawing a colophon.
      '/api/v1/contributors': { prerender: true },
      '/api/v1/specimens.css': { headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } },
      // The HTML variant is negotiable against `text/markdown`, so a cache has to key on `Accept`.
      ...Object.fromEntries(negotiatedRoutes.map(route => [route, { headers: { vary: 'Accept, Accept-Encoding' } }])),
      // Every API response points at the document that describes it.
      '/api/v1/**': { headers: { link: '</openapi.json>; rel="service-desc"; type="application/json"' } },
      '/api/v1/catalogue.css': { headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } },
      '/fonts/**': { isr: familyPage },
      '/fonts/*/_payload.json': { isr: familyPage },
      '/api/v1/fonts/*': { isr: familyEntry },
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
         * Every page sets its first paragraph in the three families below, so they are preloaded;
         * italic is rare enough on a given page to be worth a late request. `fontaine`'s metric
         * fallback cannot cover a swap here, because `local("serif")` matches no installed family
         * and the face never loads.
         *
         * The interface is in English, so `latin` is the whole of it.
         */
        defaults: { preload: (_family, font) => font.style !== 'italic' },
        families: [
          // The variable cut carries Newsreader's optical-size axis.
          { name: 'Newsreader', provider: 'google', weights: ['200 800'], styles: ['normal'], subsets: ['latin'] },
          // The variable cut, so the 350 and 450 body weights are real rather than rounded.
          { name: 'Switzer', provider: 'fontshare', weights: ['100 900'], styles: ['normal', 'italic'], subsets: ['latin'] },
          { name: 'JetBrains Mono', provider: 'google', weights: ['400'], styles: ['normal'], subsets: ['latin'] },
          /*
           * The front page's specimens. The grid is fixed, so the faces belong in the build rather
           * than behind a provider stylesheet, cut down to the characters a card sets: the family's
           * own name and the specimen line.
           *
           * `global`, because a card sets its face through an inline `font-family` that no
           * stylesheet scan can find. No fallback, because `local()` matches nothing here and each
           * one costs five more `@font-face` rules.
           */
          ...FEATURED_FAMILIES
            .filter(name => !INTERFACE_FAMILIES.includes(name))
            .map(name => ({
              name,
              global: true,
              preload: false,
              fallbacks: [],
              glyphs: specimenGlyphs(name),
              weights: ['400'],
              styles: ['normal' as const],
              subsets: ['latin'],
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
    /*
     * Markdown errors for clients that did not ask for HTML. Prepended: `errorHandler` is also
     * where Nuxt puts the `error.vue` renderer, which it registers only if the option is free.
     */
    'nitro:config': (nitro) => {
      const agentErrors = fileURLToPath(new URL('server/error.ts', import.meta.url))
      const existing = nitro.errorHandler ? [nitro.errorHandler].flat() : []
      nitro.errorHandler = [agentErrors, ...existing]
    },

    // The content pages and the endpoints behind them, so no request has to read markdown from a
    // filesystem a serverless deployment does not have.
    'prerender:routes': async ({ routes }) => {
      const { content } = await import('./server/utils/content.ts')
      const pages = new Set(proseRoutes)
      const paths = (await content.list()).map((file: { path: string }) => file.path)
      for (const path of paths) {
        routes.add(path)
        // Each endpoint is prerendered to a file, so `/docs`, which is also the parent of every
        // chapter, would have to be a file and a directory at once. It is left to the server.
        if (!paths.some((other: string) => other.startsWith(`${path}/`))) {
          routes.add(`/api/content/get/${path.replace(/^\//, '')}`)
        }
        pages.add(path)
      }
      for (const page of pages) {
        routes.add(markdownTwin(page))
      }
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
