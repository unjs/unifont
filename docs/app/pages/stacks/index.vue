<script setup lang="ts">
import type { StacksResponse } from '#shared/types'

const { data, status } = await useFetch<StacksResponse>('/api/v1/stacks', { key: 'stacks-recent' })

const stacks = computed(() => data.value?.stacks ?? [])

const { session } = useAtprotoSession()

const families = computed(() => [...new Set(stacks.value.flatMap(entry => entry.stack.roles.map(role => role.family)))].slice(0, 40))

useHead(() => ({
  link: families.value.length
    ? [{ rel: 'stylesheet', href: `/api/v1/css?families=${families.value.map(encodeURIComponent).join(',')}` }]
    : [],
}))

useProviderPreconnect()

usePageSeo({
  title: 'Stacks',
  description: 'Collections of font families that people have published.',
})
</script>

<template>
  <div class="stacks">
    <header class="head">
      <h1 class="head__title">
        Stacks
      </h1>
      <p class="head__lede">
        Stacks people have published.
        <NuxtLink to="/stack">Build one</NuxtLink> to share or publish.
        <template v-if="session">
          Or check
          <NuxtLink :to="`/stacks/@${session.handle}`">ones you've already published</NuxtLink>.
        </template>
      </p>
    </header>

    <p
      v-if="data?.unavailable"
      class="warning"
    >
      The backlink index didn’t answer, so this list is empty rather than complete.
    </p>

    <template v-else-if="status === 'pending'">
      <p
        class="visually-hidden"
        role="status"
      >
        Reading the index…
      </p>
      <StackCard
        v-for="placeholder in 3"
        :key="placeholder"
      />
    </template>

    <p
      v-else-if="!stacks.length"
      class="warning"
    >
      Nothing published yet. Yours would be the first.
    </p>

    <StackCard
      v-for="entry in stacks"
      :key="`${entry.author.did}-${entry.rkey}`"
      :entry="entry"
    />
  </div>
</template>

<style scoped>
.stacks {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  font-size: var(--text-2xl);
}

.head__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.warning {
  padding-block: var(--space-lg);
  color: var(--color-muted);
  font-size: var(--text-sm);
}
</style>
