<script setup lang="ts">
import type { BaselineTransferResponse, FacetsResponse } from '#shared/types'
import { CATALOGUE_PAGE, PREVIEW_MAX, previewText } from '#shared/featured'

const { warm } = useFontWarmup()

function prefetch(family: string, provider: string) {
  warm(family, provider)
  prefetchFamilyData(family, provider)
}

const route = useRoute()
const router = useRouter()

const q = computed(() => String(route.query.q ?? ''))
const provider = computed(() => String(route.query.provider ?? ''))
const offset = computed(() => {
  const value = Number(route.query.offset ?? 0)
  return Number.isFinite(value) ? Math.max(Math.trunc(value), 0) : 0
})

const text = computed(() => previewText(route.query.text))
const variable = computed(() => route.query.variable === '1')
const italic = computed(() => route.query.italic === '1')
const subset = computed(() => String(route.query.subset ?? ''))

const { data: facets } = await useFetch<FacetsResponse>('/api/v1/facets', { key: 'facets' })

function toggleFacet(name: 'variable' | 'italic') {
  const on = name === 'variable' ? variable.value : italic.value
  router.replace({ query: { ...route.query, [name]: on ? undefined : '1', offset: undefined } })
}

function setSubset(value: string) {
  router.replace({ query: { ...route.query, subset: value || undefined, offset: undefined } })
}

const term = ref(q.value)
const preview = ref(text.value ?? '')
let debounce: ReturnType<typeof setTimeout> | undefined
let previewDebounce: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  clearTimeout(debounce)
  clearTimeout(previewDebounce)
})
watch(term, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    router.replace({ query: { ...route.query, q: value || undefined, offset: undefined } })
  }, 200)
})
watch(q, (value) => {
  if (value !== term.value) {
    term.value = value
  }
})

// Longer than the search debounce: a keystroke here is a new subset, not a filter.
watch(preview, (value) => {
  clearTimeout(previewDebounce)
  previewDebounce = setTimeout(() => {
    router.replace({ query: { ...route.query, text: previewText(value) } })
  }, 400)
})
watch(text, (value) => {
  if ((value ?? '') !== preview.value) {
    preview.value = value ?? ''
  }
})

const { data, status } = await useFetch('/api/v1/fonts', {
  query: {
    q,
    provider,
    variable: () => (variable.value ? '1' : undefined),
    italic: () => (italic.value ? '1' : undefined),
    subset,
    limit: CATALOGUE_PAGE,
    offset,
  },
  key: () => `catalogue-${q.value}-${provider.value}-${variable.value}-${italic.value}-${subset.value}-${offset.value}`,
})

const filtered = computed(() => variable.value || italic.value || Boolean(subset.value))

const { data: catalogue } = await useProviders()

const enumerable = computed(() => catalogue.value?.providers.filter(item => item.families) ?? [])

/**
 * One stylesheet for the families on screen, so a page of specimens is one request. The first
 * page as served is inlined into the head instead; searching or paging past it moves to a link.
 */
const { covered, release } = useInlinedSpecimens('/api/v1/catalogue.css')
watch([q, provider, offset, text, variable, italic, subset], () => release())

const stylesheet = computed(() => {
  const families = data.value?.families.map(item => item.family) ?? []
  if (!families.length || (covered.value && !text.value)) {
    return undefined
  }
  const query = text.value ? `&text=${encodeURIComponent(text.value)}` : '&preset=specimen'
  return `/api/v1/css?families=${families.map(encodeURIComponent).join(',')}${query}`
})

useHead(() => ({
  link: stylesheet.value ? [{ rel: 'stylesheet', href: stylesheet.value }] : [],
}))

useProviderPreconnect()

usePageSeo({
  title: 'Catalogue',
  description: 'Search every font family unifont can list, across Google Fonts, Bunny, Fontshare and Fontsource.',
})

// Never awaited into the page: a page of HEAD probes is slower than the catalogue itself.
const families = computed(() => data.value?.families.map(item => item.family) ?? [])
const { data: transfer } = useFetch<BaselineTransferResponse>('/api/v1/transfer', {
  query: { families: () => families.value.join(',') },
  key: () => `transfer-${families.value.join(',')}`,
  server: false,
  lazy: true,
})

const basis = computed(() => {
  const value = transfer.value?.basis
  return value ? `${value.weights.join(' + ')}, ${value.subsets.join(', ')}, ${value.formats.join(', ')}` : null
})

function size(family: string) {
  const bytes = transfer.value?.families[family]?.bytes
  if (!bytes) {
    return null
  }
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb).toLocaleString('en')} kB`
}

const linkQuery = computed(() => {
  const query: Record<string, string> = {}
  if (provider.value) {
    query.provider = provider.value
  }
  if (text.value) {
    query.text = text.value
  }
  return Object.keys(query).length ? query : undefined
})

function setProvider(name: string) {
  router.replace({
    query: { ...route.query, provider: provider.value === name ? undefined : name, offset: undefined },
  })
}

function page(delta: number) {
  router.replace({ query: { ...route.query, offset: Math.max(offset.value + delta * CATALOGUE_PAGE, 0) || undefined } })
}

const showing = computed(() => {
  const total = data.value?.total ?? 0
  if (!total) {
    return null
  }
  return { from: offset.value + 1, to: Math.min(offset.value + CATALOGUE_PAGE, total), total }
})

// Rendered unconditionally: a live region inserted alongside its first message is not reliably
// announced.
const count = computed(() => {
  if (showing.value) {
    const { from, to, total } = showing.value
    return `${from.toLocaleString('en')}–${to.toLocaleString('en')} of ${total.toLocaleString('en')}`
  }
  if (status.value === 'pending') {
    return 'loading…'
  }
  return `Nothing matches “${q.value}”.`
})

const atStart = computed(() => offset.value === 0)
const atEnd = computed(() => !showing.value || showing.value.to >= showing.value.total)

// Paging to the last page refuses the button that was just pressed, so it is `aria-disabled`
// rather than `disabled`, which cannot hold focus.
function turn(delta: number) {
  if (delta < 0 ? atStart.value : atEnd.value) {
    return
  }
  page(delta)
}
</script>

<template>
  <div class="catalogue">
    <header class="head">
      <h1 class="head__title">
        Catalogue
      </h1>
      <p class="head__lede">
        Every family listed by any of these providers.
      </p>

      <div class="search">
        <label
          class="search__label"
          for="catalogue-search"
        >Search families</label>
        <input
          id="catalogue-search"
          v-model="term"
          class="search__input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="Fraunces, Switzer, Inter…"
        >
      </div>

      <div class="search">
        <label
          class="search__label"
          for="catalogue-preview"
        >Preview text</label>
        <input
          id="catalogue-preview"
          v-model="preview"
          class="search__input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :maxlength="PREVIEW_MAX"
          placeholder="Set your own words…"
        >
      </div>

      <ul class="filters">
        <li>
          <button
            class="filter"
            type="button"
            :aria-pressed="!provider"
            @click="setProvider('')"
          >
            all
          </button>
        </li>
        <li
          v-for="item in enumerable"
          :key="item.name"
        >
          <button
            class="filter"
            type="button"
            :aria-pressed="provider === item.name"
            @click="setProvider(item.name)"
          >
            {{ item.name }} <span class="filter__count">{{ item.families!.toLocaleString('en') }}</span>
          </button>
        </li>
        <li v-if="facets?.variable">
          <button
            class="filter"
            type="button"
            :aria-pressed="variable"
            @click="toggleFacet('variable')"
          >
            variable <span class="filter__count">{{ facets.variable.toLocaleString('en') }}</span>
          </button>
        </li>
        <li v-if="facets?.italic">
          <button
            class="filter"
            type="button"
            :aria-pressed="italic"
            @click="toggleFacet('italic')"
          >
            italic <span class="filter__count">{{ facets.italic.toLocaleString('en') }}</span>
          </button>
        </li>
        <li v-if="facets?.subsets.length">
          <label
            class="visually-hidden"
            for="catalogue-subset"
          >Script</label>
          <select
            id="catalogue-subset"
            class="filter filter--select"
            :value="subset"
            @change="setSubset(($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              any script
            </option>
            <option
              v-for="item in facets.subsets"
              :key="item.name"
              :value="item.name"
            >
              {{ item.name }} ({{ item.families.toLocaleString('en') }})
            </option>
          </select>
        </li>
      </ul>

      <!-- Typing filters the grid with no navigation, so this is the only report that the results
           changed. -->
      <p
        class="head__count"
        role="status"
      >
        {{ count }}
      </p>

      <p
        v-if="filtered && facets?.unknown"
        class="head__basis"
      >
        {{ facets.unknown.toLocaleString('en') }} families publish no properties through their
        provider’s index, so a filter cannot keep them.
      </p>

      <p
        v-if="basis"
        class="head__basis"
      >
        Sizes are bytes on the wire for {{ basis }}. A family split by <code>unicode-range</code>
        totals every chunk, of which a browser fetches only the ones a page sets.
      </p>
    </header>

    <ul
      v-if="data?.families.length"
      class="grid"
    >
      <li
        v-for="entry in data.families"
        :key="entry.family"
        class="cell"
      >
        <NuxtLink
          class="cell__link"
          :to="{ path: `/fonts/${encodeURIComponent(entry.family)}`, query: linkQuery }"
          @mouseenter="prefetch(entry.family, provider)"
          @focus="prefetch(entry.family, provider)"
        >
          <!-- The name is set once, in its own face, and is the link's accessible name. -->
          <span
            class="cell__specimen"
            :style="{ fontFamily: `'${entry.family}', var(--font-display)` }"
          >{{ text ?? entry.family }}</span>
          {{ ' ' }}
          <span
            v-if="text"
            class="cell__name"
          >{{ entry.family }}</span>
          {{ ' ' }}
          <span class="cell__providers">
            {{ entry.providers.join(' · ') }}
            <span
              v-if="size(entry.family)"
              class="cell__size"
            >{{ size(entry.family) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p
      v-if="data?.unavailable.length"
      class="warning"
    >
      No answer from {{ data.unavailable.join(', ') }}, so the counts and results are missing whatever they host.
    </p>

    <nav
      v-if="showing && showing.total > CATALOGUE_PAGE"
      class="pager"
      aria-label="Catalogue pages"
    >
      <button
        class="pager__button"
        type="button"
        :aria-disabled="atStart"
        @click="turn(-1)"
      >
        ← previous
      </button>
      <button
        class="pager__button"
        type="button"
        :aria-disabled="atEnd"
        @click="turn(1)"
      >
        next →
      </button>
    </nav>
  </div>
</template>

<style scoped>
.catalogue {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  font-size: var(--text-2xl);
}

.head__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.search {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  margin-top: var(--space-lg);
}

/* Visible, because a placeholder leaves as soon as there is a query in the field. */
.search__label {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.search__input {
  width: min(100%, 32rem);
  padding: var(--space-xs) 0;
  background: none;
  border: 0;
  /* The rule is the whole affordance of this control, so it carries 1.4.11's 3:1. */
  border-bottom: var(--rule-hair) solid var(--color-neutral);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  outline-offset: 4px;
}

.search__input::placeholder {
  color: var(--color-neutral);
}

.filters {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin: var(--space-lg) 0 0;
  padding: 0;
  list-style: none;
}

.filter {
  min-height: 2rem;
  padding: var(--space-2xs) var(--space-xs);
  background: none;
  border: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--dur-micro) var(--ease-out),
    border-color var(--dur-micro) var(--ease-out);
}

.filter:hover {
  border-color: var(--color-rule-strong);
  color: var(--color-ink);
}

.filter--select {
  appearance: none;
  padding-right: var(--space-md);
  background-image:
    linear-gradient(45deg, transparent 50%, currentcolor 50%),
    linear-gradient(135deg, currentcolor 50%, transparent 50%);
  background-position: right 0.75rem center, right 0.55rem center;
  background-size: 0.3rem 0.3rem;
  background-repeat: no-repeat;
}

.filter[aria-pressed='true'] {
  border-color: var(--color-ink);
  color: var(--color-ink-strong);
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.filter__count {
  color: var(--color-neutral);
  font-variant-numeric: tabular-nums;
}

.head__basis {
  margin-top: var(--space-2xs);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.head__count {
  margin-top: var(--space-md);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));
  margin: 0;
  padding: 0;
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
  gap: var(--space-2xs);
  height: 100%;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  text-decoration: none;
  transition: background-color var(--dur-micro) var(--ease-out);
}

.cell__link:hover {
  background: var(--color-paper-2);
}

/* Specimens size to their own cell rather than to a breakpoint. */
.cell__specimen {
  container-type: inline-size;
  /* Two lines, always, so a name that wraps differently in the fallback cannot resize its row. */
  min-height: 2lh;
  font-size: clamp(1.1rem, 11cqi, 1.75rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.cell__size {
  color: var(--color-ink);
}

.cell__name {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.cell__providers {
  margin-top: auto;
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* Attribution recedes until a cell is hovered, through colour rather than `opacity` or `blur`,
   which take it to 1.6:1 and render a string no zoom can sharpen. */
@media (hover: hover) {
  .cell__providers {
    transition: color var(--dur-short) var(--ease-out);
  }

  .cell__link:hover .cell__providers,
  .cell__link:focus-visible .cell__providers {
    color: var(--color-ink);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell__providers {
    transition-duration: 0s;
  }
}

.warning {
  max-width: var(--measure);
  margin-top: var(--space-lg);
  color: var(--color-warning);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.pager {
  display: flex;
  gap: var(--space-md);
  padding-block: var(--space-xl);
}

.pager__button {
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--rule-hair) solid var(--color-rule-strong);
  cursor: pointer;
  font-size: var(--text-sm);
  white-space: nowrap;
}

.pager__button:hover:not([aria-disabled='true']) {
  background: var(--color-paper-2);
}

.pager__button:active:not([aria-disabled='true']) {
  transform: translateY(1px);
}

.pager__button[aria-disabled='true'] {
  border-color: var(--color-rule);
  color: var(--color-neutral);
  cursor: not-allowed;
}

@media (width < 40rem) {
  .search__input {
    font-size: var(--text-md);
  }

  .cell__specimen {
    font-size: var(--text-md);
  }
}
</style>
