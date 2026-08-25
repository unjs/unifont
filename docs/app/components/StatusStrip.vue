<script setup lang="ts">
// Server-rendered: fetched on the client this lands after hydration and shifts the masthead.
const { data } = await useFetch('/api/v1/status', { key: 'status-strip' })
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

.strip__cell--warn {
  color: var(--color-warning);
}
</style>
