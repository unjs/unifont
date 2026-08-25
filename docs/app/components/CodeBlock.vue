<script setup lang="ts">
const props = defineProps<{
  code: string
  label?: string
  /** A MicroLighter grammar name. Without it the block renders unhighlighted. */
  language?: string
  /** Shown when there is nothing to copy yet, e.g. an unresolved family. */
  empty?: string
  pending?: boolean
}>()

const { $highlightCode } = useNuxtApp()

// MicroLighter matches its grammar synchronously, and the cost is not linear in the length of the
// block: 60 kB of resolved CSS locks the main thread for minutes. Past this it renders plain.
const HIGHLIGHT_LIMIT = 16_000
const highlighted = computed(() => props.language && props.code.length <= HIGHLIGHT_LIMIT ? props.language : undefined)

// The highlighter walks the DOM once per navigation, so a block whose contents change in place
// has to ask for another pass.
watch(() => [props.code, props.language], () => {
  if (typeof $highlightCode === 'function') {
    $highlightCode()
  }
})

type State = 'idle' | 'copying' | 'copied' | 'failed'
const state = ref<State>('idle')
let timer: ReturnType<typeof setTimeout> | undefined

const pre = useTemplateRef<HTMLElement>('pre')
const { overflowing, measure } = useOverflow(pre)
watch(() => [props.code, props.language], () => nextTick(measure))

const canCopy = computed(() => !props.pending && !!props.code)

const buttonLabel = computed(() => {
  switch (state.value) {
    case 'copying': return 'copying…'
    case 'copied': return 'copied'
    case 'failed': return 'select it instead'
    default: return 'copy'
  }
})

// The outcome is on the button's label too, but a name changing under an already-focused control
// is not reliably announced.
const announcement = computed(() => {
  switch (state.value) {
    case 'copied': return `${props.label ?? 'Code'} copied to the clipboard`
    case 'failed': return 'Copying failed. Select the code and copy it instead.'
    default: return ''
  }
})

async function copy() {
  if (!canCopy.value) {
    return
  }
  clearTimeout(timer)
  state.value = 'copying'
  try {
    await navigator.clipboard.writeText(props.code)
    state.value = 'copied'
  }
  catch {
    state.value = 'failed'
  }
  timer = setTimeout(() => {
    state.value = 'idle'
  }, state.value === 'failed' ? 4000 : 1600)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <!-- A header, not a `figcaption`, which would fold the copy button's label into the block's
       accessible name. -->
  <div class="block">
    <div class="block__bar">
      <span class="block__label">
        {{ label }}
        <slot name="help" />
      </span>
      <button
        class="block__copy"
        type="button"
        :disabled="!canCopy"
        :data-state="state"
        @click="copy"
      >
        {{ buttonLabel }}
      </button>
    </div>
    <p
      class="visually-hidden"
      role="status"
    >
      {{ announcement }}
    </p>
    <p
      v-if="pending"
      class="block__placeholder"
    >
      resolving…
    </p>
    <p
      v-else-if="!code"
      class="block__placeholder"
    >
      {{ empty ?? 'Nothing to show yet.' }}
    </p>
    <pre
      v-else
      ref="pre"
      class="block__pre"
      :tabindex="overflowing ? 0 : undefined"
    ><code :class="highlighted ? `language-${highlighted}` : undefined">{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.block {
  overflow: hidden;
  border: var(--rule-hair) solid var(--color-rule);
}

.block__bar {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2xs) var(--space-2xs) var(--space-2xs) var(--space-md);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper-2);
}

.block__label {
  display: flex;
  gap: var(--space-2xs);
  align-items: center;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.block__copy {
  min-height: 1.9rem;
  padding: var(--space-2xs) var(--space-xs);
  background: none;
  border: var(--rule-hair) solid transparent;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--dur-micro) var(--ease-out),
    border-color var(--dur-micro) var(--ease-out);
}

.block__copy:hover:not(:disabled) {
  border-color: var(--color-rule-strong);
  color: var(--color-ink);
}

.block__copy:active:not(:disabled) {
  transform: translateY(1px);
}

.block__copy:disabled {
  color: var(--color-rule-strong);
  cursor: not-allowed;
}

.block__copy[data-state='copied'] {
  color: var(--color-positive);
  border-color: currentcolor;
}

.block__copy[data-state='failed'] {
  color: var(--color-negative);
  border-color: currentcolor;
}

.block__placeholder {
  padding: var(--space-md);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.block__pre {
  max-height: 26rem;
  overflow: auto;
  padding: var(--space-md);
  font-size: var(--text-sm);
  line-height: 1.7;
  tab-size: 2;
  white-space: pre;
}
</style>
