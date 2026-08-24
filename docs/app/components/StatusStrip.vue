<script setup lang="ts">
// Server-rendered: fetched on the client this lands after hydration and shifts the masthead.
const { data } = await useFetch('/api/v1/status', { key: 'status-strip' })

// Read once. On an interval this would be auto-updating content, which owes the reader a way to
// stop it (SC 2.2.2); the line dates the index against the reader's clock rather than being one.
const clock = ref('')
onMounted(() => {
  clock.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
})

const age = computed(() => {
  const ms = data.value?.indexAge
  if (ms === undefined) {
    return null
  }
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  return `${Math.floor(minutes / 60)}h ago`
})
</script>

<template>
  <dl
    v-if="data"
    class="strip"
  >
    <div class="strip__cell">
      <dt class="strip__key">index</dt>
      <dd class="strip__value">{{ data.families.toLocaleString('en') }} families</dd>
    </div>
    <div class="strip__cell">
      <dt class="strip__key">cross-listed</dt>
      <dd class="strip__value">{{ data.crossListed.toLocaleString('en') }}</dd>
    </div>
    <div class="strip__cell">
      <dt class="strip__key">answering</dt>
      <dd class="strip__value">{{ data.providers }} providers</dd>
    </div>
    <div class="strip__cell">
      <dt class="strip__key">built</dt>
      <dd class="strip__value">{{ age }}</dd>
    </div>
    <div class="strip__cell">
      <dt class="strip__key">your clock</dt>
      <dd class="strip__value strip__value--clock">{{ clock }}</dd>
    </div>
    <div
      v-if="data.unavailable.length"
      class="strip__cell strip__cell--warn"
    >
      <dt class="strip__key">not answering</dt>
      <dd class="strip__value">{{ data.unavailable.join(', ') }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.strip {
  display: flex;
  gap: var(--space-sm) var(--space-md);
  align-items: baseline;
  flex-wrap: wrap;
  padding-block: var(--space-xs);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.strip__cell {
  display: inline-flex;
  gap: var(--space-2xs);
  align-items: baseline;
  white-space: nowrap;
}

.strip__value {
  margin: 0;
}

.strip__key {
  color: var(--color-neutral);
}

.strip__key::after {
  content: ':';
}

/* The clock only exists after mount, so its width is held open for it. */
.strip__value--clock {
  display: inline-block;
  min-width: 5ch;
}

.strip__cell--warn {
  color: var(--color-warning);
}
</style>
