<script setup lang="ts">
import { specimenAlias } from '#shared/featured'

type FamilyResult = Awaited<ReturnType<typeof searchFamilies>>['families'][number]

function searchFamilies(q: string) {
  return $fetch('/api/v1/fonts', { query: { q, limit: 8 } })
}

const props = defineProps<{ id: string, label: string, modelValue: string, placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { warm } = useFontWarmup()

const query = ref(props.modelValue)
const matches = ref<FamilyResult[]>([])
const active = ref(-1)
const open = ref(false)

/** Catalogue spellings seen so far, so a typed name commits as the catalogue writes it. */
const spellings = new Map<string, string>()

watch(() => props.modelValue, (value) => {
  if (value !== query.value) {
    query.value = value
  }
})

let sequence = 0
let debounce: ReturnType<typeof setTimeout> | undefined

async function search(term: string) {
  const ticket = ++sequence
  if (!term.trim()) {
    matches.value = []
    return
  }
  try {
    const { families } = await searchFamilies(term.trim())
    if (ticket !== sequence) {
      return
    }
    matches.value = families
    active.value = -1
    for (const entry of families) {
      spellings.set(entry.family.toLowerCase(), entry.family)
      warm(entry.family)
    }
  }
  catch {
    if (ticket === sequence) {
      matches.value = []
    }
  }
}

/** Strip characters with no place in a font family name but that could break out of markup/CSS contexts. */
function sanitizeFamilyName(value: string) {
  return value.replace(/[<>"'`]/g, '')
}

function onInput(value: string) {
  query.value = sanitizeFamilyName(value)
  open.value = true
  clearTimeout(debounce)
  debounce = setTimeout(() => search(value), 140)
}

function commit(value: string) {
  clearTimeout(debounce)
  sequence++
  const family = spellings.get(value.trim().toLowerCase()) ?? sanitizeFamilyName(value)
  query.value = family
  open.value = false
  matches.value = []
  if (family) {
    warm(family)
  }
  if (family !== props.modelValue) {
    emit('update:modelValue', family)
  }
}

function onKeydown(event: KeyboardEvent) {
  const listed = open.value && matches.value.length
  if (event.key === 'ArrowDown' && listed) {
    event.preventDefault()
    active.value = (active.value + 1) % matches.value.length
  }
  else if (event.key === 'ArrowUp' && listed) {
    event.preventDefault()
    active.value = (active.value - 1 + matches.value.length) % matches.value.length
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    commit(matches.value[active.value]?.family ?? query.value)
  }
  else if (event.key === 'Escape' && listed) {
    event.preventDefault()
    open.value = false
  }
}

const listed = computed(() => open.value && matches.value.length > 0)
const activeId = computed(() => (listed.value && active.value >= 0 ? `${props.id}-option-${active.value}` : undefined))
const announcement = computed(() => {
  if (!listed.value) {
    return ''
  }
  return matches.value.length === 1 ? '1 family' : `${matches.value.length} families`
})

/** The warmed specimen face, then the family itself for a page that already declares it. */
const specimenFor = (family: string) => `'${specimenAlias(family)}', '${family}', var(--font-display)`

onBeforeUnmount(() => clearTimeout(debounce))
</script>

<template>
  <div class="combo">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      :value="query"
      class="combo__input"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-autocomplete="list"
      :aria-controls="listed ? `${id}-listbox` : undefined"
      :aria-expanded="listed"
      :aria-activedescendant="activeId"
      :placeholder="placeholder"
      :style="{ fontFamily: modelValue ? specimenFor(modelValue) : undefined }"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
      @blur="commit(query)"
    >
    <p
      class="visually-hidden"
      role="status"
    >
      {{ announcement }}
    </p>
    <!-- Options are not focusable: the input keeps focus and `onKeydown` drives the highlight. -->
    <!-- eslint-disable vuejs-accessibility/interactive-supports-focus -->
    <!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events -->
    <ul
      v-if="listed"
      :id="`${id}-listbox`"
      class="combo__list"
      role="listbox"
      :aria-label="label"
    >
      <li
        v-for="(entry, index) in matches"
        :id="`${id}-option-${index}`"
        :key="entry.family"
        class="row"
        :class="{ 'row--active': index === active }"
        role="option"
        :aria-selected="index === active"
        @mouseenter="active = index"
        @mousedown.prevent="commit(entry.family)"
      >
        <span
          class="row__specimen"
          :style="{ fontFamily: specimenFor(entry.family) }"
        >{{ entry.family }}</span>
        {{ ' ' }}
        <span class="row__providers">{{ entry.providers.join(' · ') }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.combo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.combo label {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.combo__input {
  width: 100%;
  padding: var(--space-xs) 0;
  background: none;
  border: 0;
  border-bottom: var(--rule-hair) solid var(--color-neutral);
  font-family: var(--font-display);
  font-size: var(--text-md);
  outline-offset: 4px;
}

.combo__list {
  position: absolute;
  z-index: 2;
  inset-inline: 0;
  inset-block-start: 100%;
  max-block-size: min(24rem, 50vh);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  background: var(--color-paper);
  border: var(--rule-hair) solid var(--color-rule-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-whisper);
  list-style: none;
}

.row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
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

.row__providers {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}
</style>
