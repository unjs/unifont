<script setup lang="ts">
interface FamilyResult {
  family: string
  providers: string[]
}

const palette = useCommandPalette()
const { warm } = useFontWarmup()
const router = useRouter()

const query = ref('')
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const active = ref(0)
const families = ref<FamilyResult[]>([])
const status = ref<'idle' | 'pending' | 'ready' | 'error'>('idle')
const showPending = ref(false)

const destinations = [
  { label: 'All fonts', hint: 'Browse or filter the whole catalogue', to: '/fonts' },
  { label: 'Compare providers', hint: 'One family, every CDN, side by side', to: '/compare' },
  { label: 'Documentation', hint: 'Install, providers, custom providers', to: '/docs' },
  { label: 'HTTP API', hint: 'The endpoints this site is built on', to: '/api' },
] as const

const matchingDestinations = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) {
    return destinations.slice()
  }
  return destinations.filter(item => `${item.label} ${item.hint}`.toLowerCase().includes(needle))
})

const rows = computed(() => [
  ...families.value.map(item => ({ kind: 'family' as const, key: `family:${item.family}`, item })),
  ...matchingDestinations.value.map(item => ({ kind: 'page' as const, key: `page:${item.to}`, item })),
])

let pendingTimer: ReturnType<typeof setTimeout> | undefined
let sequence = 0

async function search(term: string) {
  const trimmed = term.trim()
  const ticket = ++sequence

  if (!trimmed) {
    clearTimeout(pendingTimer)
    showPending.value = false
    families.value = []
    status.value = 'idle'
    return
  }

  status.value = 'pending'
  clearTimeout(pendingTimer)
  // Delay the pending state so a warm cache never flashes a spinner.
  pendingTimer = setTimeout(() => {
    if (status.value === 'pending') {
      showPending.value = true
    }
  }, 150)

  try {
    const result = await $fetch<{ families: FamilyResult[] }>('/api/v1/fonts', {
      query: { q: trimmed, limit: 8 },
    })
    if (ticket !== sequence) {
      return
    }
    families.value = result.families
    status.value = 'ready'
  }
  catch {
    if (ticket === sequence) {
      families.value = []
      status.value = 'error'
    }
  }
  finally {
    if (ticket === sequence) {
      clearTimeout(pendingTimer)
      showPending.value = false
    }
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(value), 140)
})
watch(rows, () => {
  active.value = 0
})

// Every listed family is on screen, so all of them need their specimen face.
watch(families, (list) => {
  for (const item of list) {
    warm(item.family)
  }
}, { immediate: true })

// Whether the listbox is in the document. Gating every relationship attribute on one flag keeps
// `aria-expanded`, `aria-controls` and `aria-activedescendant` from describing an absent list.
const listed = computed(() => rows.value.length > 0)

const activeId = computed(() => (listed.value ? `palette-row-${active.value}` : undefined))

// The list is driven by `aria-activedescendant`, so focus never moves and nothing is announced on
// its own.
const liveStatus = computed(() => {
  if (status.value === 'error') {
    return ''
  }
  if (showPending.value) {
    return 'Searching'
  }
  if (!query.value.trim()) {
    return ''
  }
  return rows.value.length === 1 ? '1 result' : `${rows.value.length} results`
})

function go(row: typeof rows.value[number]) {
  palette.close()
  if (row.kind === 'family') {
    router.push(`/fonts/${encodeURIComponent(row.item.family)}`)
  }
  else {
    router.push(row.item.to)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
    event.preventDefault()
    active.value = rows.value.length ? (active.value + 1) % rows.value.length : 0
  }
  else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
    event.preventDefault()
    active.value = rows.value.length ? (active.value - 1 + rows.value.length) % rows.value.length : 0
  }
  else if (event.key === 'Escape') {
    // A `type="search"` input swallows the first Escape to clear itself, so the dialog's native
    // cancel never fires.
    event.preventDefault()
    palette.close()
  }
  else if (event.key === 'Enter') {
    const row = rows.value[active.value]
    if (row) {
      event.preventDefault()
      go(row)
    }
  }
}

watch(palette.isOpen, async (open) => {
  if (open) {
    query.value = palette.initialQuery.value
    dialog.value?.showModal()
    await nextTick()
    input.value?.focus()
    if (query.value) {
      search(query.value)
    }
  }
  else {
    dialog.value?.close()
  }
})

onMounted(() => {
  const onGlobalKey = (event: KeyboardEvent) => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      if (palette.isOpen.value) {
        palette.close()
      }
      else {
        palette.open()
      }
    }
  }
  window.addEventListener('keydown', onGlobalKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))
})
</script>

<template>
  <dialog
    ref="dialog"
    class="palette"
    aria-label="Search fonts and pages"
    @close="palette.close()"
  >
    <div class="palette__panel">
      <div class="palette__field">
        <label
          class="visually-hidden"
          for="palette-input"
        >Search fonts and pages</label>
        <input
          id="palette-input"
          ref="input"
          v-model="query"
          class="palette__input"
          type="search"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-controls="listed ? 'palette-results' : undefined"
          :aria-expanded="listed"
          :aria-activedescendant="activeId"
          spellcheck="false"
          placeholder="Newsreader, Switzer, JetBrains Mono…"
          @keydown="onKeydown"
        >
        <span
          v-if="showPending"
          class="palette__pending"
        >searching</span>
      </div>

      <p
        v-if="status === 'error'"
        class="palette__note palette__note--error"
        role="alert"
      >
        The catalogue didn't answer. Try again, or browse
        <NuxtLink
          to="/fonts"
          @click="palette.close()"
        >all fonts</NuxtLink>.
      </p>

      <p
        v-if="status === 'ready' && !listed"
        class="palette__note"
      >
        Nothing matches “{{ query }}”. If you're checking whether a name exists anywhere, ask every
        provider at once in
        <NuxtLink
          to="/compare"
          @click="palette.close()"
        >compare</NuxtLink>.
      </p>

      <ul
        v-if="listed"
        id="palette-results"
        class="palette__list"
        role="listbox"
        aria-label="Results"
      >
        <!--
          APG combobox pattern: rows are `role="option"` and not focusable, and the input drives the
          highlight through `aria-activedescendant`. The rules below all assume a focusable row.
        -->
        <!-- eslint-disable vuejs-accessibility/click-events-have-key-events -->
        <!-- eslint-disable vuejs-accessibility/interactive-supports-focus -->
        <!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events -->
        <li
          v-for="(row, index) in rows"
          :id="`palette-row-${index}`"
          :key="row.key"
          class="row"
          :class="{ 'row--active': index === active }"
          role="option"
          :aria-selected="index === active"
          @mouseenter="active = index"
          @click="go(row)"
        >
          <template v-if="row.kind === 'family'">
            <span
              class="row__specimen"
              :style="{ fontFamily: `'${row.item.family}', var(--font-display)` }"
            >{{ row.item.family }}</span>
            {{ ' ' }}
            <span class="row__meta">{{ row.item.providers.join(' · ') }}</span>
          </template>
          <template v-else>
            <!-- Vue condenses whitespace between elements, so the separator is explicit or the
                 label and the hint concatenate when the option is read out. -->
            <span class="row__label">{{ row.item.label }}</span>
            {{ ' ' }}
            <span class="row__meta">{{ row.item.hint }}</span>
          </template>
        </li>
      </ul>

      <p
        class="visually-hidden"
        role="status"
      >
        {{ liveStatus }}
      </p>

      <p class="palette__footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </p>
    </div>
  </dialog>
</template>

<style scoped>
.palette {
  width: min(38rem, calc(100vw - 2 * var(--space-md)));
  max-width: none;
  margin-top: 12vh;
  margin-inline: auto;
  padding: 0;
  background: var(--color-paper);
  border: var(--rule-hair) solid var(--color-rule-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-whisper);
  color: var(--color-ink);
}

.palette::backdrop {
  background: var(--color-scrim);
  backdrop-filter: blur(2px);
}

/*
 * The panel scales in; only the scrim fades. Fading the panel draws its labels semi-transparent
 * for the length of the animation, taking the smallest text to ~4.2:1 against whatever shows
 * through.
 */
@media (prefers-reduced-motion: no-preference) {
  .palette[open] {
    animation: palette-in var(--dur-short) var(--ease-out);
  }

  .palette[open]::backdrop {
    animation: palette-scrim-in var(--dur-short) var(--ease-out);
  }
}

@keyframes palette-in {
  from {
    transform: scale(0.98);
  }
}

@keyframes palette-scrim-in {
  from {
    opacity: 0;
  }
}

.palette__field {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

/* The field is flush with the panel edge, so the ring is drawn inside it rather than offset. */
.palette__field:focus-within {
  outline: var(--rule-heavy) solid var(--color-focus);
  outline-offset: calc(-1 * var(--rule-heavy));
}

.palette__input {
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  outline: none;
}

.palette__input:focus-visible {
  outline: none;
}

.palette__input::placeholder {
  color: var(--color-neutral);
}

.palette__pending {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.palette__note {
  padding: var(--space-md);
  color: var(--color-muted);
  font-size: var(--text-sm);
  max-width: var(--measure);
}

.palette__note--error {
  color: var(--color-negative);
}

.palette__list {
  max-height: min(24rem, 50vh);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

/* Rows are `role="option"`, not buttons, so a row can be read out while the reader is typing. */
.row {
  display: flex;
  gap: var(--space-md);
  align-items: baseline;
  justify-content: space-between;
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  border-left: var(--rule-heavy) solid transparent;
  cursor: pointer;
  text-align: left;
}

.row--active {
  background: var(--color-paper-2);
  border-left-color: var(--color-accent);
}

.row__specimen {
  font-size: var(--text-md);
  line-height: 1.2;
}

.row__label {
  font-weight: var(--weight-body-strong);
}

.row__meta {
  flex: none;
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.palette__footer {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-xs) var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
  color: var(--color-neutral);
  font-size: var(--text-xs);
}

.palette__footer kbd {
  margin-right: var(--space-3xs);
  font-family: var(--font-mono);
}

/*
 * Provider names are the only thing separating two rows with the same family name, and the hints
 * are the only place the shortcuts are written down, so narrow widths stack and wrap rather than
 * dropping either.
 */
@media (width < 40rem) {
  .row {
    flex-direction: column;
    gap: var(--space-3xs);
    align-items: stretch;
  }

  .row__meta {
    flex: initial;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .palette__footer {
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
  }
}
</style>
