<script setup lang="ts">
const { warm, claim } = useFontWarmup()

const route = useRoute()
const router = useRouter()

const PAGE = 36

const q = computed(() => String(route.query.q ?? ''))
const provider = computed(() => String(route.query.provider ?? ''))
const offset = computed(() => {
  const value = Number(route.query.offset ?? 0)
  return Number.isFinite(value) ? Math.max(Math.trunc(value), 0) : 0
})

const term = ref(q.value)
let debounce: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(debounce))
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

const { data, status } = await useFetch('/api/v1/fonts', {
  query: { q, provider, limit: PAGE, offset },
  key: () => `catalogue-${q.value}-${provider.value}-${offset.value}`,
})

const { data: catalogue } = await useProviders()

const enumerable = computed(() => catalogue.value?.providers.filter(item => item.families) ?? [])

/** One stylesheet for the families on screen, so a page of specimens is one request. */
const stylesheet = computed(() => {
  const families = data.value?.families.map(item => item.family) ?? []
  if (!families.length) {
    return undefined
  }
  return `/api/v1/css?families=${families.map(encodeURIComponent).join(',')}`
})

useHead(() => ({
  link: stylesheet.value ? [{ rel: 'stylesheet', href: stylesheet.value }] : [],
}))

// Every family on the page is already declared by the batch stylesheet above.
watch(() => data.value?.families, (families) => {
  if (families?.length) {
    claim(families.map(entry => entry.family))
  }
}, { immediate: true })

usePageSeo({
  title: 'Catalogue',
  description: 'Search every font family unifont can list, across Google Fonts, Bunny, Fontshare and Fontsource.',
})

function setProvider(name: string) {
  router.replace({
    query: { ...route.query, provider: provider.value === name ? undefined : name, offset: undefined },
  })
}

function page(delta: number) {
  router.replace({ query: { ...route.query, offset: Math.max(offset.value + delta * PAGE, 0) || undefined } })
}

const showing = computed(() => {
  const total = data.value?.total ?? 0
  if (!total) {
    return null
  }
  return { from: offset.value + 1, to: Math.min(offset.value + PAGE, total), total }
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
        Every family the providers here will list. npm and Adobe can resolve a family by name, but they
        can't list one. npm is the whole registry, and Adobe needs your own Typekit id.
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
      </ul>

      <!-- Typing filters the grid with no navigation, so this is the only report that the results
           changed. -->
      <p
        class="head__count"
        role="status"
      >
        {{ count }}
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
          :to="{ path: `/fonts/${encodeURIComponent(entry.family)}`, query: provider ? { provider } : undefined }"
          @mouseenter="warm(entry.family)"
          @focus="warm(entry.family)"
        >
          <!-- Set twice, in its own face and in mono; only one of them is read out. -->
          <span
            class="cell__specimen"
            aria-hidden="true"
            :style="{ fontFamily: `'${entry.family}', '${entry.family} fallback', var(--font-display)` }"
          >{{ entry.family }}</span>
          <span class="cell__name">{{ entry.family }}</span>
          <span class="cell__providers">{{ entry.providers.join(' · ') }}</span>
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
      v-if="showing && showing.total > PAGE"
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

.filter[aria-pressed='true'] {
  border-color: var(--color-ink);
  color: var(--color-ink-strong);
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.filter__count {
  color: var(--color-neutral);
  font-variant-numeric: tabular-nums;
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
  font-size: clamp(1.1rem, 11cqi, 1.75rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.cell__name {
  margin-top: auto;
  font-size: var(--text-sm);
}

.cell__link:hover .cell__name {
  color: var(--color-ink-strong);
}

.cell__providers {
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
