<script setup lang="ts">
import type { CompareResponse, CompareRow } from '#shared/types'
import { SPECIMEN_LINE } from '~/utils/featured'

const route = useRoute()
const router = useRouter()

const family = computed(() => String(route.query.family ?? ''))
const term = ref(family.value)

watch(family, (value) => {
  if (value !== term.value) {
    term.value = value
  }
})

function submit() {
  router.replace({ query: { ...route.query, family: term.value.trim() || undefined } })
}

const { data, error, refresh } = await useAsyncData<CompareResponse | null>(
  () => `compare-${family.value}`,
  () => (family.value
    ? $fetch(`/api/v1/fonts/${encodeURIComponent(family.value)}/compare`)
    : Promise.resolve(null)),
)

const answered = computed(() =>
  !!family.value && data.value?.family?.toLowerCase() === family.value.toLowerCase(),
)

const rows = computed<CompareRow[]>(() => (answered.value ? data.value?.results ?? [] : []))
const available = computed(() => rows.value.filter(row => row.available))

/** Providers that answered come first; the rest are still listed, since "no" is an answer too. */
const orderedRows = computed(() => [...available.value, ...rows.value.filter(row => !row.available)])

/** Aliases a provider's faces, so several CDNs can render the same family side by side. */
const aliasFor = (provider: string) => `cmp-${provider}-${family.value}`

useHead(() => ({
  link: available.value.map(row => ({
    rel: 'stylesheet',
    href: `/api/v1/fonts/${encodeURIComponent(family.value)}/css?provider=${row.provider}&as=${encodeURIComponent(aliasFor(row.provider))}`,
  })),
}))

usePageSeo({
  title: () => (family.value ? `${family.value} across providers` : 'Compare providers'),
  description: 'Ask every font provider for the same family and compare weights, subsets, hosts and file counts.',
})

const suggestions = ['Inter', 'Newsreader', 'Roboto', 'Space Grotesk', 'Outfit']

// The answers arrive without a navigation, so this is the only thing that reports them. The region
// is always rendered: a live region created alongside its first message is not reliably announced.
const progress = computed(() => {
  if (!family.value) {
    return ''
  }
  if (!answered.value) {
    return `Asking every provider for ${family.value}…`
  }
  if (!available.value.length) {
    return `No provider here hosts ${family.value}.`
  }
  return `${available.value.length} of ${rows.value.length} providers host ${family.value}.`
})

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`

/** Where the providers' answers genuinely differ. */
const divergence = computed(() => {
  if (available.value.length < 2) {
    return []
  }
  const notes: string[] = []
  const weightCounts = new Set(available.value.map(row => row.weights?.length ?? 0))
  if (weightCounts.size > 1) {
    notes.push(`weights differ (${available.value.map(row => `${row.provider} ${row.weights?.length ?? 0}`).join(', ')})`)
  }
  const subsetCounts = new Set(available.value.map(row => row.subsets?.length ?? 0))
  if (subsetCounts.size > 1) {
    notes.push(`subset coverage differs (${available.value.map(row => `${row.provider} ${row.subsets?.length ?? 0}`).join(', ')})`)
  }
  const italics = new Set(available.value.map(row => String(row.styles?.includes('italic') ?? false)))
  if (italics.size > 1) {
    notes.push('only some providers offer an italic')
  }
  const faceCounts = new Set(available.value.map(row => row.faces ?? 0))
  if (faceCounts.size > 1) {
    notes.push(`face counts differ (${available.value.map(row => `${row.provider} ${row.faces ?? 0}`).join(', ')}), so one provider splits the family up much more than another`)
  }
  // Only providers that reported every file can be compared on size.
  const measured = available.value.filter(row => row.bytes && row.measured === row.files)
  if (measured.length > 1) {
    const low = Math.min(...measured.map(row => row.bytes!))
    const high = Math.max(...measured.map(row => row.bytes!))
    if (high > low * 1.15) {
      const lowest = measured.find(row => row.bytes === low)!
      const highest = measured.find(row => row.bytes === high)!
      notes.push(`the whole family costs ${kb(low)} from ${lowest.provider} and ${kb(high)} from ${highest.provider}`)
    }
  }
  const hosts = new Set(available.value.map(row => row.host).filter(Boolean))
  if (hosts.size > 1) {
    notes.push(`served from ${hosts.size} different hosts`)
  }
  return notes
})
</script>

<template>
  <div class="compare">
    <header class="head">
      <h1 class="head__title">
        One family, every provider
      </h1>
      <p class="head__lede">
        The same request, sent to every provider unifont can ask without credentials. Useful if you're
        deciding which CDN to pull a font from, or checking whether a family exists outside Google Fonts.
      </p>

      <form
        class="form"
        @submit.prevent="submit"
      >
        <p class="form__field">
          <label
            class="form__label"
            for="compare-family"
          >Font family</label>
          <input
            id="compare-family"
            v-model="term"
            class="form__input"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Newsreader"
          >
        </p>
        <button
          class="form__submit"
          type="submit"
        >
          Compare
        </button>
      </form>

      <p
        class="visually-hidden"
        role="status"
      >
        {{ progress }}
      </p>

      <p class="head__suggest">
        try
        <template
          v-for="(name, index) in suggestions"
          :key="name"
        >
          <NuxtLink :to="`/compare?family=${encodeURIComponent(name)}`">{{ name }}</NuxtLink><span v-if="index < suggestions.length - 1">, </span>
        </template>
      </p>
    </header>

    <p
      v-if="!family"
      class="empty"
    >
      Type a family above to see how each provider answers.
    </p>

    <div
      v-else-if="error"
      class="empty"
    >
      <p>We couldn't reach the providers to compare <strong>{{ family }}</strong>.</p>
      <button
        class="retry"
        type="button"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <p
      v-else-if="!answered"
      class="empty"
    >
      asking every provider…
    </p>

    <template v-else>
      <p
        v-if="!available.length"
        class="empty"
      >
        None of the providers here host <strong>{{ family }}</strong>. It may still be on Adobe Fonts or published
        to npm. Both can resolve a family by name; neither can be searched from here.
      </p>

      <template v-else>
        <section
          class="specimens"
          aria-labelledby="specimens-heading"
        >
          <h2
            id="specimens-heading"
            class="section-title"
          >
            {{ family }}, as each provider serves it
          </h2>
          <ul class="specimens__list">
            <li
              v-for="row in available"
              :key="row.provider"
              class="specimen"
            >
              <span class="specimen__provider">{{ row.provider }}</span>
              <span
                class="specimen__line"
                :style="{ fontFamily: `'${aliasFor(row.provider)}', '${aliasFor(row.provider)} fallback', var(--font-display)` }"
              >{{ SPECIMEN_LINE }}</span>
              <span class="specimen__host">{{ row.host }}</span>
            </li>
          </ul>
        </section>

        <p class="divergence">
          <span class="divergence__text">
            <template v-if="divergence.length">
              <strong>Where they disagree:</strong> {{ divergence.join(' · ') }}.
            </template>
            <template v-else>
              <strong>They agree.</strong> Same weights, same styles, same subsets. Choose on host and
              licence instead.
            </template>
          </span>
        </p>

        <section
          class="sheet"
          aria-labelledby="sheet-heading"
        >
          <h2
            id="sheet-heading"
            class="section-title"
          >
            Side by side
          </h2>
          <TableScroller>
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">
                    Provider
                  </th>
                  <th
                    class="table__num"
                    scope="col"
                  >
                    Weights
                  </th>
                  <th scope="col">
                    Italic
                  </th>
                  <th
                    class="table__num"
                    scope="col"
                  >
                    Subsets
                  </th>
                  <th
                    class="table__num"
                    scope="col"
                  >
                    Faces
                  </th>
                  <th
                    class="table__num"
                    scope="col"
                  >
                    Size
                  </th>
                  <th scope="col">
                    Served from
                  </th>
                  <th scope="col">
                    Fallbacks
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in orderedRows"
                  :key="row.provider"
                  :class="{ 'table__row--out': !row.available }"
                >
                  <th scope="row">
                    <NuxtLink
                      v-if="row.available"
                      class="table__provider"
                      :to="`/fonts/${encodeURIComponent(family)}?provider=${row.provider}`"
                    >
                      <code>{{ row.provider }}</code>
                    </NuxtLink>
                    <code v-else>{{ row.provider }}</code>
                  </th>
                  <template v-if="row.available">
                    <td class="table__num">
                      {{ row.weights?.length ?? '—' }}
                    </td>
                    <td>{{ row.styles?.includes('italic') ? 'yes' : 'no' }}</td>
                    <td class="table__num">
                      {{ row.subsets?.length ?? '—' }}
                    </td>
                    <td class="table__num">
                      {{ row.faces ?? '—' }}
                    </td>
                    <td class="table__num">
                      <template v-if="row.bytes && row.measured === row.files">{{ kb(row.bytes) }}</template>
                      <template v-else-if="row.bytes">~{{ kb(row.bytes) }}</template>
                      <span
                        v-else
                        class="table__quiet"
                      >not reported</span>
                    </td>
                    <td class="table__mono">
                      {{ row.host ?? '—' }}
                    </td>
                    <td class="table__quiet">
                      {{ row.fallbacks?.length ? row.fallbacks.join(', ') : 'none' }}
                    </td>
                  </template>
                  <td
                    v-else
                    class="table__quiet"
                    colspan="7"
                  >
                    {{ row.error ?? "doesn't host this family" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroller>
          <p class="sheet__note">
            Weight counts include variable ranges, which unifont reports as one
            <code>'100 900'</code> entry. Sizes are the whole family, at every weight and subset the provider
            publishes, measured with <code>HEAD</code> requests. A provider that doesn't send
            <code>content-length</code> shows as “not reported”. Each provider links through to
            {{ family }} resolved from that provider alone.
          </p>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.compare {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.section-title {
  margin-bottom: var(--space-md);
  font-size: var(--text-lg);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  max-width: 22ch;
  font-size: var(--text-display-s);
  letter-spacing: -0.03em;
}

.head__lede {
  max-width: var(--measure);
  margin-top: var(--space-sm);
  color: var(--color-muted);
}

.form {
  display: flex;
  gap: var(--space-md);
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: var(--space-xl);
}

.form__field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 12rem;
  max-width: 26rem;
}

/* Visible, because a placeholder leaves as soon as there is a family in the field. */
.form__label {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.form__input {
  width: 100%;
  padding: var(--space-xs) 0;
  background: none;
  border: 0;
  /* The rule is the whole affordance of this control, so it carries 1.4.11's 3:1. */
  border-bottom: var(--rule-hair) solid var(--color-neutral);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  outline-offset: 4px;
}

.form__input::placeholder {
  color: var(--color-neutral);
}

.form__submit {
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--rule-hair) solid var(--color-ink);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--dur-micro) var(--ease-out);
}

.form__submit:hover {
  background: var(--color-paper-3);
}

.form__submit:active {
  transform: translateY(1px);
}

.head__suggest {
  margin-top: var(--space-md);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.empty {
  max-width: var(--measure);
  padding-block: var(--space-2xl) var(--space-3xl);
  color: var(--color-muted);
}

.retry {
  margin-top: var(--space-lg);
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  color: var(--color-ink);
  background: none;
  border: var(--rule-hair) solid var(--color-ink);
  cursor: pointer;
}

.specimens {
  padding-block: var(--space-xl);
}

.specimens__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.specimen {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr) 16rem;
  gap: var(--space-md);
  align-items: baseline;
  padding-block: var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.specimen__provider {
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* Wraps rather than truncating: an ellipsis deletes part of the specimen. */
.specimen__line {
  font-size: var(--text-2xl);
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.specimen__host {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.divergence {
  padding: var(--space-md) 0;
  border-block: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.divergence__text {
  display: block;
  max-width: 78ch;
}

.divergence strong {
  color: var(--color-ink);
  font-weight: var(--weight-body-strong);
}

.sheet {
  padding-block: var(--space-xl);
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
  white-space: nowrap;
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

.table__num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.table__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.table__quiet {
  color: var(--color-neutral);
}

.table__provider {
  color: inherit;
  text-decoration-color: var(--color-rule-strong);
  text-underline-offset: 0.2em;
}

.table__provider:hover {
  text-decoration-color: currentcolor;
}

/* Recessed by colour rather than `opacity`, which compounds with the already-quiet cell colours. */
.table__row--out th,
.table__row--out td {
  color: var(--color-neutral);
}

.sheet__note {
  max-width: var(--measure);
  margin-top: var(--space-md);
  color: var(--color-neutral);
  font-size: var(--text-sm);
}

@media (width < 60rem) {
  .specimen {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2xs);
  }

  .specimen__line {
    font-size: var(--text-xl);
  }
}
</style>
