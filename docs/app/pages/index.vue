<script setup lang="ts">
import { FEATURED_FAMILIES } from '#shared/featured'

const palette = useCommandPalette()
const shortcut = useCommandShortcut()

const { data: catalogue } = await useProviders()

usePageSeo({
  title: 'Every font CDN, one lookup',
  description:
    'unifont reads font metadata from Google Fonts, Bunny, Fontshare, Fontsource and npm through one API. Look up a family, see what it really offers, and copy the CSS.',
})

const surfaces = [
  { to: '/fonts', label: 'Catalogue', note: 'Every family the providers will list. Search it, or filter by provider.' },
  { to: '/compare', label: 'Compare', note: 'Ask every provider for the same family and see how the answers differ.' },
  { to: '/docs', label: 'Docs', note: 'Install it, resolve a family, cache the results, write your own provider.' },
  { to: '/api', label: 'API', note: 'Every page here is an HTTP endpoint you can call yourself.' },
] as const

const siteUrl = useRuntimeConfig().public.siteUrl

/** Identity for anything resolving the entity behind this domain. */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#unifont`,
      'name': 'unifont',
      'alternateName': 'unifont.dev',
      'url': siteUrl,
      'description': 'unifont reads font metadata from every major font CDN through one interface: Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons, npm and Adobe Fonts. It returns weights, styles, subsets, unicode ranges and @font-face data in the same shape for every provider.',
      'applicationCategory': 'DeveloperApplication',
      'operatingSystem': 'Node.js, Bun, Deno, browsers, edge runtimes',
      'programmingLanguage': 'TypeScript',
      'license': 'https://opensource.org/licenses/MIT',
      'isAccessibleForFree': true,
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'installUrl': 'https://www.npmjs.com/package/unifont',
      'downloadUrl': 'https://www.npmjs.com/package/unifont',
      'codeRepository': 'https://github.com/unjs/unifont',
      'author': { '@id': `${siteUrl}/#maintainer` },
      'maintainer': { '@id': `${siteUrl}/#maintainer` },
      'sameAs': [
        'https://github.com/unjs/unifont',
        'https://www.npmjs.com/package/unifont',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      'name': 'unifont',
      'url': siteUrl,
      'inLanguage': 'en',
      'description': 'Look up a typeface across every font CDN in one place: metadata, specimens, unicode coverage, and the CSS to ship it.',
      'about': { '@id': `${siteUrl}/#unifont` },
      'author': { '@id': `${siteUrl}/#maintainer` },
      'potentialAction': {
        '@type': 'SearchAction',
        'target': { '@type': 'EntryPoint', 'urlTemplate': `${siteUrl}/fonts?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}/#maintainer`,
      'name': 'Daniel Roe',
      'url': 'https://roe.dev',
      'sameAs': ['https://github.com/danielroe', 'https://roe.dev'],
    },
  ],
}

useHead({
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(structuredData) }],
})

const install = `import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontshare(),
])

await unifont.getFontProperties('Switzer')
// → { weights: ['300', …], styles: ['normal', 'italic'], … }`
</script>

<template>
  <div class="home">
    <section
      class="masthead"
    >
      <h1 class="masthead__title">
        Every font CDN, one lookup.
      </h1>
      <p class="masthead__lede">
        <strong>unifont</strong> reads font metadata from CDNs: weights, styles, subsets, unicode ranges and
        <code>@font-face</code> data &ndash; the same shape for every provider.
      </p>
      <StatusStrip class="masthead__strip" />
      <div class="masthead__actions">
        <button
          class="find"
          type="button"
          @click="palette.open()"
        >
          <span>Find a family</span>
          <!-- Vue condenses whitespace between elements, so the separator is explicit or the label
               and the shortcut concatenate in the accessible name and in extracted text. -->
          {{ ' ' }}
          <kbd>{{ shortcut }}</kbd>
        </button>
        <NuxtLink
          class="jump"
          to="/docs"
        >Read the docs</NuxtLink>
      </div>
    </section>

    <!-- The index. Each name is set in its own face, resolved by unifont at build time. -->
    <section
      class="index"
      aria-labelledby="index-heading"
    >
      <div class="index__head">
        <h2
          id="index-heading"
          class="index__heading"
        >
          Some fonts you might like &hellip;
        </h2>
        <p class="index__note">
          {{ FEATURED_FAMILIES.length }} families, resolved through <code>google</code> and <code>fontshare</code> at
          build time, subsetted to the glyphs below and served from here.
        </p>
      </div>
      <ul class="grid">
        <li
          v-for="family in FEATURED_FAMILIES"
          :key="family"
          class="cell"
        >
          <NuxtLink
            class="cell__link"
            :to="`/fonts/${encodeURIComponent(family)}`"
            @mouseenter="prefetchFamilyData(family)"
            @focus="prefetchFamilyData(family)"
          >
            <!-- The name is set once, in its own face, and is the link's accessible name. -->
            <span
              class="cell__specimen"
              :style="{ fontFamily: `'${family}', var(--font-display)` }"
            >{{ family }}</span>
          </NuxtLink>
        </li>
      </ul>
      <p class="index__more">
        <NuxtLink to="/fonts">Browse the whole catalogue →</NuxtLink>
      </p>
    </section>

    <section
      class="prose"
      aria-labelledby="use-heading"
    >
      <div class="prose__text">
        <h2 id="use-heading">
          Consistent font metadata
        </h2>
        <h3>One shape for every provider</h3>
        <p>
          Every font CDN has its own API. unifont provides <NuxtLink to="/docs/reference">consistent metadata</NuxtLink> and <code>@font-face</code> data you can hand straight to the browser.
        </p>
        <h3>Runs wherever your code does</h3>
        <p>
          It runs anywhere: Node, Bun, Deno, workers, and <NuxtLink to="/docs/browser">the browser, via a self-hostable proxy</NuxtLink>. This site is (of course!) powered by unifont.
        </p>
        <h3>&hellip; or let a bundler do it</h3>
        <p>
          Use
          <a href="https://github.com/unjs/fontaine/tree/main/packages/fontless">fontless</a> in any Vite app, or
          <a href="https://fonts.nuxt.com">@nuxt/fonts</a> in Nuxt. They wrap unifont, download and host your fonts, and inject metric fallbacks to reduce layout shift.
        </p>
      </div>
      <figure class="prose__figure">
        <figcaption>npm i unifont</figcaption>
        <pre><code class="language-typescript">{{ install }}</code></pre>
      </figure>
    </section>

    <section
      class="providers"
      aria-labelledby="providers-heading"
    >
      <h2 id="providers-heading">
        Built-in providers
      </h2>
      <TableScroller>
        <table class="table">
          <thead>
            <tr>
              <th scope="col">
                Provider
              </th>
              <th scope="col">
                Metadata from
              </th>
              <th
                class="table__num"
                scope="col"
              >
                Families
              </th>
              <th scope="col">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="provider in catalogue?.providers ?? []"
              :key="provider.name"
            >
              <th scope="row">
                <code>{{ provider.name }}</code>
              </th>
              <td class="table__mono">
                {{ provider.origin }}
              </td>
              <td class="table__num">
                <template v-if="provider.families">
                  {{ provider.families.toLocaleString('en') }}
                </template>
                <template v-else>
                  <span class="table__none">—<span class="visually-hidden"> can’t be listed</span></span>
                </template>
              </td>
              <td>{{ provider.note }}</td>
            </tr>
          </tbody>
        </table>
      </TableScroller>
      <p class="index__more">
        <NuxtLink to="/docs/providers">Provider documentation</NuxtLink> ·
        <NuxtLink to="/docs/custom-providers">Create your own provider</NuxtLink>
      </p>
    </section>

    <section
      class="surfaces"
      aria-labelledby="surfaces-heading"
    >
      <h2 id="surfaces-heading">
        Where to go next
      </h2>
      <dl class="surfaces__list">
        <div
          v-for="surface in surfaces"
          :key="surface.to"
          class="surfaces__row"
        >
          <dt>
            <NuxtLink
              class="underline-reveal"
              :to="surface.to"
            >{{ surface.label }}</NuxtLink>
          </dt>
          <dd>{{ surface.note }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

/* ── Masthead ─────────────────────────────────────────────── */
.masthead {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: var(--space-xl) var(--space-2xl);
  align-items: end;
  padding-block: var(--space-3xl) var(--space-2xl);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.masthead__title {
  grid-column: 1;
  max-width: calc(20 * var(--char));
  font-size: var(--text-display);
  letter-spacing: -0.035em;
  /* Newsreader's opsz axis tops out at 72, which is the display drawing rather than a scaled-up
     text cut. `wght` is restated because `font-variation-settings` resets axes it omits. */
  font-variation-settings: 'opsz' 72, 'wght' 600;
}

.masthead__lede {
  grid-column: 2;
  grid-row: 1;
  max-width: var(--measure-tight);
  color: var(--color-muted);
  font-size: var(--text-md);
  line-height: 1.5;
  text-wrap: pretty;
}

.masthead__lede strong {
  color: var(--color-ink);
  font-weight: var(--weight-body-strong);
}

.masthead__strip {
  grid-column: 1 / -1;
  padding-top: var(--space-xs);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.masthead__actions {
  display: flex;
  grid-column: 1 / -1;
  gap: var(--space-lg);
  align-items: center;
  flex-wrap: wrap;
}

.find {
  display: inline-flex;
  gap: var(--space-sm);
  align-items: center;
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--rule-hair) solid var(--color-ink);
  border-radius: var(--radius-none);
  cursor: pointer;
  font-size: var(--text-base);
  white-space: nowrap;
  transition:
    background-color var(--dur-micro) var(--ease-out),
    transform var(--dur-micro) var(--ease-out);
}

.find:hover {
  background: var(--color-paper-3);
}

.find:active {
  transform: translateY(1px);
}

.find kbd {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.jump {
  font-size: var(--text-base);
  text-decoration-color: var(--color-rule-strong);
  white-space: nowrap;
}

/* ── The index ────────────────────────────────────────────── */
.index {
  padding-block: var(--space-2xl);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.index__head {
  display: flex;
  gap: var(--space-md) var(--space-2xl);
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: var(--space-xl);
}

.index__heading {
  font-size: var(--text-xl);
}

.index__note {
  max-width: calc(44 * var(--char));
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));
  gap: 0;
  margin: 0;
  padding: 0;
  border-top: var(--rule-hair) solid var(--color-rule);
  list-style: none;
}

.cell {
  border-right: var(--rule-hair) solid var(--color-rule);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  /* A cell off screen is not laid out and its face is not fetched, so the grid does not compete
     with the interface's own fonts for the first paint. */
  content-visibility: auto;
  contain-intrinsic-size: auto 8rem;
}

.cell__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  height: 100%;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  text-decoration: none;
  transition: background-color var(--dur-micro) var(--ease-out);
}

.cell__link:hover {
  background: var(--color-paper-2);
}

/* Specimens size to their own cell, so a narrow column shows smaller type, not a wrapped word. */
.cell__specimen {
  container-type: inline-size;
  /* Two lines, always, so a name that wraps differently in the fallback cannot resize its row. */
  min-height: 2lh;
  font-size: clamp(1.1rem, 11cqi, 1.75rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.index__more {
  margin-top: var(--space-lg);
  font-size: var(--text-sm);
}

/* ── Prose + code ─────────────────────────────────────────── */
.prose {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: var(--space-2xl);
  align-items: start;
  padding-block: var(--space-2xl) var(--space-lg);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.prose__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: var(--measure);
}

.prose__text h2 {
  font-size: var(--text-xl);
}

/* Subheads within the run of prose, so the section can be skimmed. */
.prose__text h3 {
  margin-top: var(--space-xs);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0;
}

/* The heading above supplies the gap. */
.prose__text h2 + h3 {
  margin-top: 0;
}

.prose__text p {
  color: var(--color-muted);
}

.prose__links {
  font-size: var(--text-sm);
}

.prose__figure {
  overflow: hidden;
  border: var(--rule-hair) solid var(--color-rule);
}

.prose__figure figcaption {
  padding: var(--space-xs) var(--space-md);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper-2);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.prose__figure pre {
  overflow-x: auto;
  padding: var(--space-md);
  font-size: var(--text-sm);
  line-height: 1.7;
  tab-size: 2;
}

/* ── Providers table ──────────────────────────────────────── */
.providers {
  padding-block: var(--space-xl);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.providers h2 {
  margin-bottom: var(--space-lg);
  font-size: var(--text-xl);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  text-align: left;
}

.table thead th {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: var(--rule-hair) solid var(--color-rule-strong);
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.table tbody th,
.table td {
  padding: var(--space-sm);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-weight: var(--weight-body);
  vertical-align: top;
}

.table tbody th {
  color: var(--color-ink);
  white-space: nowrap;
}

.table__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.table__num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.table__none {
  color: var(--color-neutral);
}

/* ── Surfaces ─────────────────────────────────────────────── */
.surfaces {
  padding-block: var(--space-xl) var(--space-lg);
}

.surfaces h2 {
  margin-bottom: var(--space-lg);
  font-size: var(--text-xl);
}

.surfaces__list {
  display: flex;
  flex-direction: column;
}

.surfaces__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 10fr);
  gap: var(--space-sm) var(--space-xl);
  padding-block: var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.surfaces__row dt {
  font-family: var(--font-display);
  font-size: var(--text-lg);
}

.surfaces__row dd {
  margin: 0;
  color: var(--color-muted);
}

/* ── Collapse ─────────────────────────────────────────────── */
@media (width < 60rem) {
  .masthead,
  .prose,
  .surfaces__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .masthead__lede {
    grid-column: 1;
    grid-row: auto;
    max-width: var(--measure);
  }

  .prose {
    padding-block: var(--space-2xl) var(--space-lg);
  }
}

/* At phone width a four-column table gives the notes two characters per line, so it holds a
   readable width and scrolls sideways instead: the data-table exception to reflow. */
.table {
  min-width: 34rem;
}

@media (width < 40rem) {
  .index__heading,
  .providers h2,
  .surfaces h2 {
    font-size: var(--text-lg);
  }

  .cell__specimen {
    font-size: var(--text-md);
  }
}
</style>
