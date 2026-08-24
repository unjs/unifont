<script setup lang="ts">
/**
 * Horizontal scroll container for a wide table, with a tab stop so it can be scrolled without a
 * pointer. A data table is exempt from reflowing at 320px (SC 1.4.10) only if it stays reachable.
 */
const scroller = useTemplateRef<HTMLElement>('scroller')
const { overflowing } = useOverflow(scroller)

// Named from its column heads, so a page with several of these does not call them all "Table".
const label = ref('Table')
onMounted(() => {
  const heads = [...(scroller.value?.querySelectorAll('thead th') ?? [])]
    .map(cell => cell.textContent?.trim())
    .filter(Boolean)
  label.value = heads.length ? `Table: ${heads.join(', ')}` : 'Table'
})
</script>

<template>
  <div
    ref="scroller"
    class="scroller"
    :role="overflowing ? 'region' : undefined"
    :aria-label="overflowing ? label : undefined"
    :tabindex="overflowing ? 0 : undefined"
  >
    <slot />
  </div>
</template>

<style scoped>
.scroller {
  max-width: 100%;
  overflow-x: auto;
  /* `overflow-x` alone lets a wide table paint past this box, which at 320px gives the whole
     document a horizontal scroll axis (SC 1.4.10). */
  contain: paint;
}
</style>
