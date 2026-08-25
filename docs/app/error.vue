<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const palette = useCommandPalette()

const isMissing = computed(() => props.error.status === 404)

usePageSeo({
  title: () => (isMissing.value ? 'Not found' : 'Something broke'),
})
</script>

<template>
  <div class="shell">
    <a
      class="skip"
      href="#main"
    >Skip to content</a>
    <SiteHeader />
    <main
      id="main"
      class="fail"
      tabindex="-1"
    >
      <p class="fail__code">
        {{ error.status }}
      </p>
      <h1 class="fail__title">
        {{ isMissing ? 'No such page.' : 'That did not work.' }}
      </h1>
      <p class="fail__body">
        <template v-if="isMissing">
          If you were after a typeface, search for it. The catalogue has every family the providers here
          will list.
        </template>
        <template v-else>
          {{ error.message || 'A provider or this server failed part way through.' }} Reloading usually
          fixes it. If it doesn't, one of the providers is probably down.
        </template>
      </p>
      <div class="fail__actions">
        <button
          class="fail__find"
          type="button"
          @click="palette.open()"
        >
          Search fonts
        </button>
        <NuxtLink
          class="fail__link"
          to="/"
        >Back to the start</NuxtLink>
      </div>
    </main>
    <LazySiteFooter hydrate-never />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Only ever focused as the skip link's target, so a ring here marks nothing. */
.fail:focus:not(:focus-visible) {
  outline: none;
}

.fail {
  flex: 1;
  max-width: var(--page-max);
  margin-inline: auto;
  padding: var(--space-3xl) var(--page-pad) var(--space-4xl);
}

.fail__code {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.fail__title {
  max-width: calc(18 * var(--char));
  margin-top: var(--space-sm);
  font-size: var(--text-display-s);
  letter-spacing: -0.03em;
}

.fail__body {
  max-width: var(--measure);
  margin-top: var(--space-md);
  color: var(--color-muted);
}

.fail__actions {
  display: flex;
  gap: var(--space-lg);
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--space-xl);
}

.fail__find {
  min-height: 2.75rem;
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--rule-hair) solid var(--color-ink);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--dur-micro) var(--ease-out);
}

.fail__find:hover {
  background: var(--color-paper-3);
}

.fail__find:active {
  transform: translateY(1px);
}

.fail__link {
  text-decoration-color: var(--color-rule-strong);
  white-space: nowrap;
}
</style>
