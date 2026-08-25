<script setup lang="ts">
import type { TransferResponse } from '#shared/types'

const route = useRoute()
const router = useRouter()

const family = computed(() => String(route.params.family ?? ''))

const weights = computed(() => String(route.query.weights ?? ''))
const subsets = computed(() => String(route.query.subsets ?? ''))
const styles = computed(() => String(route.query.styles ?? ''))

// The providers this page may answer from, in the same shape as the other facets: empty means all
// of them, and unticking narrows the cascade.
const provider = computed(() => String(route.query.provider ?? ''))
const allowedProviders = computed(() => {
  const all: string[] = data.value?.providers ?? []
  const listed = provider.value.split(',').filter(Boolean)
  const allowed = listed.filter(name => all.includes(name))
  return allowed.length ? allowed : all
})

// A chip toggle refetches against the same entry, keeping the previous answer on screen rather
// than blanking the page.
const { data, status, error, refresh } = await useFetch(() => `/api/v1/fonts/${encodeURIComponent(family.value)}`, {
  query: { weights, subsets, styles, provider },
  key: () => familyDataKey(family.value),
  transform: toFamilySummary,
  getCachedData: (key, nuxtApp, ctx) => cachedFamilyData(key, nuxtApp, ctx.cause),
})

/** A 404 means no provider has the family; anything else means the site failed to ask. */
const unknownFamily = computed(() => error.value?.status === 404)

const { drop } = useFontWarmup()

const requested = computed(() => data.value?.requested)
const properties = computed(() => data.value?.properties)

// The `preview` preset rather than the current selection, so the URL is stable for a family: it
// can be warmed on hover, and narrowing a facet does not drop and re-add every `@font-face`.
const stylesheet = computed(() => {
  const scoped = provider.value ? `&provider=${encodeURIComponent(provider.value)}` : ''
  return `/api/v1/fonts/${encodeURIComponent(family.value)}/css?preset=preview${scoped}`
})

useHead(() => ({
  link: [{ rel: 'stylesheet', href: stylesheet.value }],
}))

// The warm stylesheet paints the specimen until the preview sheet is both parsed and loaded.
// `document.fonts.ready` alone resolves immediately when no request is yet in flight.
if (import.meta.client) {
  watch(stylesheet, async (href) => {
    await nextTick()
    const link = document.head.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
    if (link && !link.sheet) {
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        link.addEventListener('load', done, { once: true })
        link.addEventListener('error', done, { once: true })
      })
    }
    await document.fonts.ready
    drop(family.value)
  }, { immediate: true, flush: 'post' })
}

usePageSeo({
  title: () => family.value,
  description: () =>
    `${family.value}: weights, styles, subsets, unicode coverage and @font-face CSS you can paste, resolved by unifont.`,
})

/* ── The tester ─────────────────────────────────────────── */
const sample = ref('Typography is what language looks like.')
const size = ref(72)

// 72px is a specimen on a desktop and a broken word on a phone.
onMounted(() => {
  const width = window.innerWidth
  size.value = width < 40 * 16 ? 34 : width < 64 * 16 ? 52 : 72
})
const tracking = ref(-2)
const leading = ref(1.1)
const italic = ref(false)

const isRange = (value: string) => value.includes(' ')

// The tester only offers what the selection resolved, so the weight control's range moves with it.
const loadedWeights = computed(() => requested.value?.weights ?? ['400'])
const loadedRange = computed(() => {
  const range = loadedWeights.value.find(isRange)
  if (!range) {
    return null
  }
  const [min, max] = range.split(/\s+/).map(Number)
  return Number.isFinite(min) && Number.isFinite(max) ? { min: min!, max: max! } : null
})
const staticWeights = computed(() => loadedWeights.value.filter(value => !isRange(value)))

const weight = ref(400)

watch([loadedRange, staticWeights], () => {
  if (loadedRange.value) {
    const { min, max } = loadedRange.value
    weight.value = Math.min(Math.max(weight.value, min), max)
    return
  }
  const available = staticWeights.value.map(Number).filter(Number.isFinite)
  if (available.length && !available.includes(weight.value)) {
    weight.value = available.includes(400) ? 400 : available[0]!
  }
}, { immediate: true })

const previewStyle = computed(() => ({
  fontFamily: `'${family.value}', '${family.value} fallback', var(--font-display)`,
  fontSize: `${size.value}px`,
  fontWeight: String(weight.value),
  fontStyle: italic.value ? 'italic' : 'normal',
  letterSpacing: `${tracking.value / 100}em`,
  lineHeight: String(leading.value),
}))

// Two different questions: what the provider publishes, and what this selection loaded.
const providerHasItalic = computed(() => (properties.value?.styles ?? []).includes('italic'))
const italicLoaded = computed(() => (requested.value?.styles ?? []).includes('italic'))

// Without the italic face loaded the browser synthesises an oblique, which is not a specimen.
watch(italicLoaded, (loaded) => {
  if (!loaded) {
    italic.value = false
  }
})
// Coverage samples have to be set in a face the selection loaded, or the browser synthesises the
// weight and the row stops being evidence.
const sampleWeight = computed(() => {
  if (loadedRange.value) {
    const { min, max } = loadedRange.value
    return Math.min(Math.max(400, min), max)
  }
  const available = staticWeights.value.map(Number).filter(Number.isFinite)
  if (!available.length) {
    return 400
  }
  return available.includes(400) ? 400 : available[0]!
})

const isVariable = computed(() => (properties.value?.weights ?? []).some(isRange))
const variableRange = computed(() => properties.value?.weights?.find(isRange))

/* ── Selections, which drive the URL so every state is linkable ─ */
function toggleValue(current: string[], value: string) {
  return current.includes(value) ? current.filter(item => item !== value) : [...current, value]
}

/** Providers publish different facets for the same name, so changing them resets the selection. */
function toggleProvider(name: string) {
  const current = allowedProviders.value
  if (current.length === 1 && current[0] === name) {
    return
  }
  const next = toggleValue([...current], name)
  router.replace({
    query: {
      ...route.query,
      provider: next.length === (data.value?.providers.length ?? 0) ? undefined : next.join(','),
      weights: undefined,
      styles: undefined,
      subsets: undefined,
    },
  })
}

function apply(key: 'weights' | 'subsets' | 'styles', values: string[]) {
  router.replace({
    query: { ...route.query, [key]: values.length ? values.join(',') : undefined },
  })
}

/** A variable range and a discrete weight cannot be resolved together, so the chips exclude. */
function toggleWeight(value: string) {
  const current = selectedWeights.value
  if (isRange(value)) {
    // Deselecting the last weight resolves to everything, which normalises back to this range
    // and snaps the chip on again.
    if (current.includes(value) && current.length === 1) {
      return
    }
    apply('weights', current.includes(value) ? [] : [value])
    return
  }
  const statics = current.filter(item => !isRange(item))
  if (statics.length === 1 && statics[0] === value) {
    return
  }
  apply('weights', toggleValue(statics, value))
}

/** An empty list means "all", so clicks cannot reach it. */
function toggleFacet(key: 'styles' | 'subsets', current: string[], value: string) {
  if (current.length === 1 && current[0] === value) {
    return
  }
  apply(key, toggleValue([...current], value))
}

// The toggles above refuse a click that would empty a group. That refusal is published as
// `aria-disabled`, not `disabled`, which would drop the chip out of reach of the explanation.
function weightLocked(value: string) {
  const current = selectedWeights.value
  if (isRange(value)) {
    return current.includes(value) && current.length === 1
  }
  const statics = current.filter(item => !isRange(item))
  return statics.length === 1 && statics[0] === value
}

function facetLocked(current: string[], value: string) {
  return current.length === 1 && current[0] === value
}

function providerLocked(name: string) {
  const current = allowedProviders.value
  return current.length === 1 && current[0] === name
}

const selectedWeights = computed(() => requested.value?.weights ?? [])
const selectedSubsets = computed(() => requested.value?.subsets ?? [])

/* ── Transfer ───────────────────────────────────────────── */
// Measured against the selection the resolver used, not the URL params: the two endpoints have
// different defaults for an absent parameter.
const transferQuery = computed(() => ({
  weights: requested.value?.weights.join(',') ?? '',
  styles: requested.value?.styles.join(',') ?? '',
  subsets: requested.value?.subsets.join(',') ?? '',
  provider: provider.value,
}))

const { data: transfer, status: transferStatus, refresh: remeasure } = await useFetch<TransferResponse>(
  () => `/api/v1/fonts/${encodeURIComponent(family.value)}/transfer`,
  {
    query: transferQuery,
    key: () => `transfer-${family.value}`,
    lazy: true,
    server: false,
    // Waits for a resolution: an empty selection would measure the endpoint's own defaults.
    immediate: false,
  },
)

watch(transferQuery, (value) => {
  if (value.weights) {
    remeasure()
  }
}, { immediate: true })

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`

/* ── Coverage ───────────────────────────────────────────── */
interface CoverageCheck { text: string, unrestricted: boolean, covered: string[], missing: string[], subsets: string[] }
type CoverageRow = Pick<CoverageCheck, 'text' | 'unrestricted' | 'missing'>
const { data: coverage } = await useFetch(
  () => `/api/v1/fonts/${encodeURIComponent(family.value)}/coverage`,
  // Server-rendered: on the client the coverage rows land after hydration and shift the page.
  {
    key: () => `coverage-${family.value}`,
    query: { provider },
    // Only the gaps are rendered.
    transform: ({ checks }: { checks: Record<string, CoverageCheck> }): { checks: Record<string, CoverageRow> } => ({
      checks: Object.fromEntries(
        Object.entries(checks).map(([name, { text, unrestricted, missing }]) => [name, { text, unrestricted, missing }]),
      ),
    }),
  },
)

/* ── Codegen ────────────────────────────────────────────── */
const tabs = [
  { id: 'css', label: 'CSS', language: 'css' },
  { id: 'unifont', label: 'unifont', language: 'typescript' },
  { id: 'fontless', label: 'fontless', language: 'typescript' },
  { id: 'nuxt', label: '@nuxt/fonts', language: 'typescript' },
  { id: 'link', label: 'HTML', language: 'html' },
] as const
const tab = ref<typeof tabs[number]['id']>('css')

// `role="tablist"` promises a single tab stop and arrow-key navigation, so both are implemented.
function onTabKeydown(event: KeyboardEvent) {
  const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  const index = tabs.findIndex(item => item.id === tab.value)
  let next = index
  if (delta) {
    next = (index + delta + tabs.length) % tabs.length
  }
  else if (event.key === 'Home') {
    next = 0
  }
  else if (event.key === 'End') {
    next = tabs.length - 1
  }
  else {
    return
  }
  event.preventDefault()
  tab.value = tabs[next]!.id
  const list = (event.currentTarget as HTMLElement).closest('[role="tablist"]')
  list?.querySelector<HTMLElement>(`#tab-${tabs[next]!.id}`)?.focus()
}

const TAB_HELP: Partial<Record<typeof tabs[number]['id'], { question: string, answer: string, href: string, linkLabel: string }>> = {
  fontless: {
    question: 'What is fontless?',
    answer: 'A Vite plugin. It finds the font families you use in CSS, resolves them through unifont, then downloads, self-hosts and metric-matches them at build time.',
    href: 'https://github.com/unjs/fontaine/tree/main/packages/fontless',
    linkLabel: 'unjs/fontaine → fontless',
  },
  nuxt: {
    question: 'What is @nuxt/fonts?',
    answer: 'The same idea as a Nuxt module: add it, write the family name in your CSS, and it handles resolution, self-hosting and metric-matched fallbacks for you.',
    href: 'https://fonts.nuxt.com',
    linkLabel: 'fonts.nuxt.com',
  },
}

const snippets = computed(() => {
  const name = family.value
  const w = requested.value?.weights ?? ['400']
  const s = requested.value?.styles ?? ['normal']
  const sub = requested.value?.subsets ?? ['latin']
  const resolved = data.value?.provider ?? 'google'

  return {
    css: data.value?.css ?? '',
    unifont: `import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.${resolved}(),
])

const { fonts, fallbacks } = await unifont.resolveFont('${name}', {
  weights: [${w.map(value => `'${value}'`).join(', ')}],
  styles: [${s.map(value => `'${value}'`).join(', ')}],
  subsets: [${sub.map(value => `'${value}'`).join(', ')}],
})`,
    fontless: `// vite.config.ts
import { defineConfig } from 'vite'
import { fontless } from 'fontless'

export default defineConfig({
  plugins: [
    fontless({
      families: [
        {
          name: '${name}',
          provider: '${resolved}',
          weights: [${w.map(value => (value.includes(' ') ? `'${value}'` : Number(value))).join(', ')}],
          styles: [${s.map(value => `'${value}'`).join(', ')}],
          subsets: [${sub.map(value => `'${value}'`).join(', ')}],
        },
      ],
    }),
  ],
})

// Then just use it in CSS. fontless finds the declaration, resolves it through unifont,
// and adds the @font-face rules plus metric-matched fallbacks.
//
//   .headline { font-family: '${name}', ${data.value?.fallbacks?.[0] ?? 'sans-serif'}; }`,
    nuxt: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/fonts'],
  fonts: {
    families: [
      {
        name: '${name}',
        provider: '${resolved}',
        weights: [${w.map(value => `'${value}'`).join(', ')}],
        styles: [${s.map(value => `'${value}'`).join(', ')}],
        subsets: [${sub.map(value => `'${value}'`).join(', ')}],
      },
    ],
  },
})`,
    link: `<link rel="stylesheet" href="https://unifont.dev/api/v1/fonts/${encodeURIComponent(name)}/css?weights=${encodeURIComponent(w.join(','))}&styles=${encodeURIComponent(s.join(','))}&subsets=${encodeURIComponent(sub.join(','))}${provider.value ? `&provider=${encodeURIComponent(provider.value)}` : ''}">

<!-- Or self-host: copy the CSS tab, download the woff2 files it points at,
     and serve them from your own origin. -->`,
  }
})
</script>

<template>
  <article class="family">
    <div
      v-if="error"
      class="state"
    >
      <h1 class="state__title">
        {{ family }}
      </h1>
      <p
        v-if="unknownFamily"
        class="state__body"
      >
        None of the providers this site can ask know this family. Check the spelling, or
        <NuxtLink to="/fonts">browse the catalogue</NuxtLink>. Adobe Fonts needs a Typekit id, so families that only exist there never show up here.
      </p>
      <p
        v-else
        class="state__body"
      >
        We couldn't reach the providers to answer for this family. That's this site, not your spelling, so a retry may well work.
      </p>
      <button
        class="state__retry"
        type="button"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <template v-else>
      <header class="head">
        <p class="head__provenance">
          <NuxtLink to="/fonts">catalogue</NuxtLink>
          <template v-if="data">
            <span aria-hidden="true"> / </span>
            <code>{{ data.provider }}</code>
            <template v-if="data.origin">
              · <code>{{ data.origin }}</code>
            </template>
          </template>
        </p>
        <h1
          class="head__name"
          :style="{ fontFamily: `'${family}', '${family} fallback', var(--font-display)` }"
        >
          {{ family }}
        </h1>
        <p class="head__facts">
          <template v-if="!data">
            <span>reading metadata…</span>
          </template>
          <span v-else-if="isVariable">variable {{ variableRange }}</span>
          <span v-else>{{ properties?.weights?.length ?? 0 }} weights</span>
          <span v-if="data">{{ providerHasItalic ? 'roman + italic' : 'roman only' }}</span>
          <span v-if="properties?.subsets?.length">{{ properties.subsets.length }} subsets</span>
          <span v-if="data?.faces">{{ data.faces }} faces resolved</span>
        </p>
      </header>

      <section
        class="tester"
        aria-labelledby="tester-heading"
      >
        <h2
          id="tester-heading"
          class="visually-hidden"
        >
          Type tester
        </h2>
        <div class="tester__stage">
          <label
            class="visually-hidden"
            for="sample"
          >Sample text</label>
          <textarea
            id="sample"
            v-model="sample"
            class="tester__input"
            rows="2"
            spellcheck="false"
            :style="previewStyle"
          />
        </div>

        <div class="tester__controls">
          <p class="control">
            <label :for="'size'">size <span class="control__value">{{ size }}px</span></label>
            <input
              id="size"
              v-model.number="size"
              type="range"
              min="12"
              max="180"
              step="1"
            >
          </p>
          <p class="control">
            <label for="leading">leading <span class="control__value">{{ leading.toFixed(2) }}</span></label>
            <input
              id="leading"
              v-model.number="leading"
              type="range"
              min="0.8"
              max="2"
              step="0.01"
            >
          </p>
          <p class="control">
            <label for="tracking">tracking <span class="control__value">{{ (tracking / 100).toFixed(2) }}em</span></label>
            <input
              id="tracking"
              v-model.number="tracking"
              type="range"
              min="-8"
              max="20"
              step="0.5"
            >
          </p>
          <p
            v-if="loadedRange"
            class="control"
          >
            <label
              class="control__label"
              for="weight"
            >
              <span>weight <span class="control__value">{{ weight }}</span></span>
              <span class="control__note">variable {{ loadedRange.min }}&ndash;{{ loadedRange.max }}</span>
            </label>
            <input
              id="weight"
              v-model.number="weight"
              type="range"
              :min="loadedRange.min"
              :max="loadedRange.max"
              step="1"
            >
          </p>
          <p
            v-else
            class="control"
          >
            <label for="weight">weight</label>
            <select
              id="weight"
              v-model.number="weight"
            >
              <option
                v-for="value in staticWeights"
                :key="value"
                :value="Number(value)"
              >
                {{ value }}
              </option>
            </select>
          </p>
          <p class="control control--check">
            <label for="italic">italic</label>
            <input
              id="italic"
              v-model="italic"
              type="checkbox"
              :disabled="!italicLoaded"
            >
            <span
              v-if="!providerHasItalic"
              class="control__note"
            >not offered by this provider</span>
            <span
              v-else-if="!italicLoaded"
              class="control__note"
            >not in the current selection</span>
          </p>
        </div>
      </section>

      <div class="workbench">
        <section
          class="knobs"
          aria-labelledby="knobs-heading"
        >
          <h2
            id="knobs-heading"
            class="section-title"
          >
            Choose what to load
          </h2>
          <p class="knobs__lede">
            {{ family }} publishes more than you probably need. Each group keeps at least one
            selection, so the last one in a group can't be turned off.
          </p>
          <!-- Chips rewrite the page with no navigation, so this line reports what the current
               selection resolved to. It stays in the document to be announced. -->
          <p
            class="tally"
            role="status"
          >
            <span class="tally__figure">{{ data?.faces ?? 0 }}</span>
            {{ (data?.faces ?? 0) === 1 ? 'face' : 'faces' }} resolved from
            {{ selectedWeights.length }} {{ selectedWeights.length === 1 ? 'weight' : 'weights' }}
            &times; {{ (requested?.styles ?? []).length }}
            {{ (requested?.styles ?? []).length === 1 ? 'style' : 'styles' }}
            &times; {{ selectedSubsets.length }}
            {{ selectedSubsets.length === 1 ? 'subset' : 'subsets' }}
          </p>
          <div
            v-if="(data?.providers.length ?? 0) > 1"
            class="meta__group"
          >
            <h3 class="meta__label">
              Providers
            </h3>
            <ul class="chips">
              <li
                v-for="name in data?.providers ?? []"
                :key="name"
              >
                <button
                  class="chip"
                  type="button"
                  :aria-pressed="allowedProviders.includes(name)"
                  :aria-disabled="providerLocked(name)"
                  @click="toggleProvider(name)"
                >
                  {{ name }}<span
                    v-if="data?.provider === name"
                    class="chip__dot"
                    aria-hidden="true"
                  >&bull;</span><span
                    v-if="data?.provider === name"
                    class="visually-hidden"
                  > (resolved from here)</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="meta__group">
            <h3 class="meta__label">
              Weights
            </h3>
            <ul class="chips">
              <li
                v-for="value in properties?.weights ?? []"
                :key="value"
              >
                <button
                  class="chip"
                  :class="{ 'chip--range': isRange(value) }"
                  type="button"
                  :aria-pressed="selectedWeights.includes(value)"
                  :aria-disabled="weightLocked(value)"
                  @click="toggleWeight(value)"
                >
                  {{ value }}<span
                    v-if="isRange(value)"
                    class="chip__tag"
                  >variable</span>
                </button>
              </li>
            </ul>
            <p
              v-for="note in data?.notes ?? []"
              :key="note"
              class="meta__note"
            >
              {{ note }}
            </p>
          </div>

          <div
            v-if="properties?.styles?.length"
            class="meta__group"
          >
            <h3 class="meta__label">
              Styles
            </h3>
            <ul class="chips">
              <li
                v-for="value in properties.styles"
                :key="value"
              >
                <button
                  class="chip"
                  type="button"
                  :aria-pressed="(requested?.styles ?? []).includes(value)"
                  :aria-disabled="facetLocked(requested?.styles ?? [], value)"
                  @click="toggleFacet('styles', requested?.styles ?? [], value)"
                >
                  {{ value }}
                </button>
              </li>
            </ul>
          </div>

          <div
            v-if="properties?.subsets?.length"
            class="meta__group"
          >
            <h3 class="meta__label">
              Subsets
            </h3>
            <ul class="chips">
              <li
                v-for="value in properties.subsets"
                :key="value"
              >
                <button
                  class="chip"
                  type="button"
                  :aria-pressed="selectedSubsets.includes(value)"
                  :aria-disabled="facetLocked(selectedSubsets, value)"
                  @click="toggleFacet('subsets', selectedSubsets, value)"
                >
                  {{ value }}
                </button>
              </li>
            </ul>
          </div>
        </section>

        <section
          class="yield"
          aria-labelledby="yield-heading"
        >
          <h2
            id="yield-heading"
            class="section-title"
          >
            What you get
          </h2>

          <h3 class="yield__label">
            Coverage
          </h3>
          <p class="meta__lede">
            Checked against the <code>unicode-range</code> of every face the provider returned.
          </p>
          <ul
            v-if="coverage"
            class="coverage__list"
          >
            <li
              v-for="(check, name) in coverage.checks"
              :key="name"
              class="coverage__row"
            >
              <span class="coverage__name">{{ name }}</span>
              <span
                class="coverage__sample"
                :style="{
                  fontFamily: `'${family}', '${family} fallback', var(--font-display)`,
                  fontWeight: String(sampleWeight),
                }"
              >{{ check.text }}</span>
              <span
                v-if="check.unrestricted"
                class="coverage__verdict"
              >no range declared</span>
              <span
                v-else-if="!check.missing.length"
                class="coverage__verdict coverage__verdict--ok"
              >✓ complete</span>
              <span
                v-else
                class="coverage__verdict coverage__verdict--gap"
              >✕ missing {{ check.missing.join(' ') }}</span>
            </li>
          </ul>
          <p
            v-else
            class="coverage__pending"
          >
            checking…
          </p>

          <h3 class="yield__label">
            Detail
          </h3>
          <dl class="facts">
            <div class="facts__row">
              <dt>Formats</dt>
              <dd>
                {{ properties?.formats?.join(', ') || 'not reported' }}
                <span class="facts__caveat">(what the provider can serve. This page asks for woff2)</span>
              </dd>
            </div>
            <div class="facts__row">
              <dt>Fallbacks</dt>
              <dd>{{ data?.fallbacks.length ? data.fallbacks.join(', ') : 'none suggested' }}</dd>
            </div>
            <div class="facts__row">
              <dt>Also on</dt>
              <dd>
                <template v-if="(data?.providers.length ?? 0) > 1">
                  {{ data?.providers.join(', ') }}.
                  <NuxtLink :to="`/compare?family=${encodeURIComponent(family)}`">compare them</NuxtLink>
                </template>
                <template v-else>
                  only <code>{{ data?.provider }}</code>
                </template>
              </dd>
            </div>
            <div class="facts__row">
              <dt>Transfer</dt>
              <dd>
                <template v-if="transfer && transfer.files">
                  {{ kb(transfer.bytes) }} across {{ transfer.files }} file{{ transfer.files === 1 ? '' : 's' }}
                  <span
                    v-if="transfer.measured < transfer.files"
                    class="facts__caveat"
                  >({{ transfer.files - transfer.measured }} did not report a length)</span>
                </template>
                <template v-else-if="transferStatus === 'pending'">
                  <span class="facts__caveat">measuring…</span>
                </template>
                <template v-else-if="transferStatus === 'error'">
                  <span class="facts__error">The CDN wouldn't tell us the size.</span>
                  <button
                    class="linkish"
                    type="button"
                    @click="remeasure()"
                  >
                    retry
                  </button>
                </template>
                <template v-else>
                  <span class="facts__caveat">nothing to measure</span>
                </template>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section
        id="ship"
        class="ship"
        aria-labelledby="ship-heading"
      >
        <h2
          id="ship-heading"
          class="section-title"
        >
          Ship it
        </h2>
        <p class="meta__lede">
          Exactly the selection above.
        </p>
        <div
          class="tabs"
          role="tablist"
          aria-label="Output format"
        >
          <button
            v-for="item in tabs"
            :id="`tab-${item.id}`"
            :key="item.id"
            class="tabs__tab"
            :class="{ 'tabs__tab--on': tab === item.id }"
            type="button"
            role="tab"
            :aria-selected="tab === item.id"
            :aria-controls="`panel-${item.id}`"
            :tabindex="tab === item.id ? undefined : -1"
            @click="tab = item.id"
            @keydown="onTabKeydown"
          >
            {{ item.label }}
          </button>
        </div>
        <div
          v-for="item in tabs"
          v-show="tab === item.id"
          :id="`panel-${item.id}`"
          :key="item.id"
          role="tabpanel"
          :aria-labelledby="`tab-${item.id}`"
        >
          <CodeBlock
            :code="snippets[item.id]"
            :label="item.label"
            :language="item.language"
            :pending="status === 'pending'"
            empty="Nothing resolves for this selection."
          >
            <template
              v-if="TAB_HELP[item.id]"
              #help
            >
              <HelpNote
                :question="TAB_HELP[item.id]!.question"
                :href="TAB_HELP[item.id]!.href"
                :link-label="TAB_HELP[item.id]!.linkLabel"
              >
                {{ TAB_HELP[item.id]!.answer }}
              </HelpNote>
            </template>
          </CodeBlock>
        </div>
      </section>
    </template>
  </article>
</template>

<style scoped>
.family {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.section-title {
  margin-bottom: var(--space-sm);
  font-size: var(--text-lg);
}

/* ── Error state ──────────────────────────────────────────── */
.state {
  padding-block: var(--space-3xl) var(--space-4xl);
  max-width: var(--measure);
}

.state__title {
  font-size: var(--text-2xl);
}

.state__body {
  margin-top: var(--space-md);
  color: var(--color-muted);
}

.state__retry {
  margin-top: var(--space-lg);
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--rule-hair) solid var(--color-ink);
  cursor: pointer;
}

/* ── Head ─────────────────────────────────────────────────── */
.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__provenance {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.head__name {
  margin-block: var(--space-sm);
  font-size: var(--text-display);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.02;
}

.head__facts {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  min-height: 1lh;
  color: var(--color-muted);
  font-size: var(--text-sm);
}

/* The separator trails its own item, so a wrap never starts a line with a middot. */
.head__facts span:not(:last-child)::after {
  content: ' ·';
  color: var(--color-rule-strong);
}

/* ── Tester ───────────────────────────────────────────────── */
.tester {
  padding-block: var(--space-xl);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.tester__input {
  display: block;
  width: 100%;
  padding: 0;
  background: none;
  border: 0;
  color: var(--color-ink-strong);
  resize: vertical;
  field-sizing: content;
  overflow-wrap: break-word;
}

.tester__input:focus-visible {
  outline-offset: 6px;
}

.tester__controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
  gap: var(--space-md) var(--space-xl);
  margin-top: var(--space-xl);
  padding-top: var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.control {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.control label {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.control__label {
  display: flex;
  gap: var(--space-xs);
  align-items: baseline;
  justify-content: space-between;
}

.control__value {
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.control input[type='range'] {
  width: 100%;
  accent-color: var(--color-accent);
}

.control select {
  padding: var(--space-2xs) var(--space-xs);
  background: var(--color-paper);
  border: var(--rule-hair) solid var(--color-rule);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.control--check {
  flex-direction: row;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.control--check input {
  /* A UA checkbox draws at ~13px, under the 24px minimum target (SC 2.5.8). */
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--color-accent);
}

.control__note {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* ── Metadata ─────────────────────────────────────────────── */
.workbench,
.ship {
  padding-block: var(--space-xl);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.workbench {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
  gap: var(--space-2xl) var(--space-3xl);
  align-items: start;
}

.knobs {
  position: sticky;
  top: 5rem;
}

.knobs__lede,
.meta__lede {
  max-width: var(--measure);
  margin-bottom: var(--space-lg);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.yield {
  min-width: 0;
}

.yield__label {
  margin-bottom: var(--space-sm);
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.yield__label + .meta__lede {
  margin-bottom: var(--space-md);
}

.yield .facts {
  margin-top: 0;
}

.yield__label:not(:first-of-type) {
  margin-top: var(--space-xl);
}

.tally {
  margin-bottom: var(--space-lg);
  padding-block: var(--space-xs);
  border-block: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.tally__figure {
  color: var(--color-ink);
}

.meta__group {
  margin-bottom: var(--space-lg);
}

.meta__label {
  margin-bottom: var(--space-xs);
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.chips {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  min-height: 2rem;
  padding: var(--space-2xs) var(--space-xs);
  background: none;
  border: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    color var(--dur-micro) var(--ease-out),
    border-color var(--dur-micro) var(--ease-out);
}

.chip:hover:not([aria-disabled='true']) {
  border-color: var(--color-rule-strong);
  color: var(--color-ink);
}

.chip:active:not([aria-disabled='true']) {
  transform: translateY(1px);
}

/* Still focusable and named, so the reason it refuses stays reachable. */
.chip[aria-disabled='true'] {
  cursor: not-allowed;
}

.chip__tag {
  margin-left: var(--space-2xs);
  color: var(--color-neutral);
}

.chip__dot {
  margin-left: var(--space-2xs);
  color: var(--color-accent);
}

.meta__note {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-warning);
  font-size: var(--text-sm);
}

.chip[aria-pressed='true'] {
  border-color: var(--color-ink);
  color: var(--color-ink-strong);
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.facts {
  margin: 0;
}

.facts__row {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: var(--space-2xs) var(--space-md);
  padding-block: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
  font-size: var(--text-sm);
}

.facts__row dt {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding-top: 0.15em;
}

.facts__row dd {
  margin: 0;
  color: var(--color-muted);
  overflow-wrap: anywhere;
}

.facts__caveat {
  color: var(--color-neutral);
}

.facts__error {
  color: var(--color-negative);
}

.linkish {
  padding: 0;
  background: none;
  border: 0;
  /* The underline is the only thing marking this as a control, so it carries 1.4.11's 3:1. */
  border-bottom: var(--rule-hair) solid var(--color-neutral);
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.linkish:disabled {
  border-bottom-color: var(--color-rule);
  color: var(--color-neutral);
  cursor: progress;
}

/* ── Coverage ─────────────────────────────────────────────── */
.coverage__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.coverage__row {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: var(--space-2xs) var(--space-md);
  align-items: baseline;
  padding-block: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.coverage__verdict {
  grid-column: 2;
}

.coverage__name {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* Wraps rather than truncating: an ellipsis would delete part of the evidence. */
.coverage__sample {
  font-size: var(--text-md);
  overflow-wrap: anywhere;
}

.coverage__verdict {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.coverage__verdict--ok {
  color: var(--color-positive);
}

.coverage__verdict--gap {
  color: var(--color-negative);
}

.coverage__pending {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* ── Ship ─────────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.tabs__tab {
  min-height: 2.25rem;
  padding: var(--space-2xs) var(--space-sm);
  background: none;
  border: var(--rule-hair) solid transparent;
  border-bottom: var(--rule-heavy) solid transparent;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--dur-micro) var(--ease-out);
}

.tabs__tab:hover {
  color: var(--color-ink);
}

.tabs__tab--on {
  border-bottom-color: var(--color-accent);
  color: var(--color-ink-strong);
}

/* ── Collapse ─────────────────────────────────────────────── */
@media (width < 64rem) {
  .workbench {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xl);
  }

  .knobs {
    position: static;
  }
}

@media (width < 40rem) {
  .coverage__row,
  .facts__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2xs);
  }

  .coverage__verdict {
    grid-column: 1;
  }
}

@media (width < 40rem) {
  .section-title {
    font-size: var(--text-md);
  }
}
</style>
