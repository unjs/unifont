<script setup lang="ts">
const props = defineProps<{
  language?: string
  filename?: string
  highlights?: string
  meta?: string
}>()

const frame = useTemplateRef<HTMLPreElement>('frame')
type State = 'idle' | 'copied' | 'failed'
const state = ref<State>('idle')
let timer: ReturnType<typeof setTimeout> | undefined

const label = computed(() => props.filename || props.language || 'code')

const { overflowing } = useOverflow(frame)

// A label changing under an already-focused button is not reliably announced.
const announcement = computed(() => {
  switch (state.value) {
    case 'copied': return `${label.value} copied to the clipboard`
    case 'failed': return 'Copying failed. Select the code and copy it instead.'
    default: return ''
  }
})

async function copy() {
  const text = frame.value?.textContent ?? ''
  if (!text) {
    return
  }
  clearTimeout(timer)
  try {
    await navigator.clipboard.writeText(text)
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
  <!-- A header rather than a `figcaption`, which would fold the copy button into the block's name. -->
  <div class="frame">
    <div class="frame__bar">
      <span
        class="frame__label"
        :data-kind="filename ? 'file' : 'language'"
      >{{ label }}</span>
      <button
        class="frame__copy"
        type="button"
        :data-state="state"
        @click="copy"
      >
        {{ state === 'copied' ? 'copied' : state === 'failed' ? 'select it instead' : 'copy' }}
      </button>
    </div>
    <p
      class="visually-hidden"
      role="status"
    >
      {{ announcement }}
    </p>
    <pre
      ref="frame"
      class="frame__pre"
      :data-language="language"
      :tabindex="overflowing ? 0 : undefined"
    ><slot /></pre>
  </div>
</template>

<style scoped>
.frame {
  margin-block: var(--space-lg);
  overflow: hidden;
  border: var(--rule-hair) solid var(--color-rule);
}

.frame__bar {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2xs) var(--space-2xs) var(--space-2xs) var(--space-md);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper-2);
}

.frame__label {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.frame__label[data-kind='language'] {
  color: var(--color-neutral);
}

.frame__copy {
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

.frame__copy:hover {
  border-color: var(--color-rule-strong);
  color: var(--color-ink);
}

.frame__copy:active {
  transform: translateY(1px);
}

.frame__copy[data-state='copied'] {
  border-color: currentcolor;
  color: var(--color-positive);
}

.frame__copy[data-state='failed'] {
  border-color: currentcolor;
  color: var(--color-negative);
}

.frame__pre {
  max-height: 32rem;
  overflow: auto;
  padding: var(--space-md);
  font-size: var(--text-sm);
  line-height: 1.7;
  tab-size: 2;
}

.frame__pre :deep(code) {
  font-size: inherit;
}
</style>
