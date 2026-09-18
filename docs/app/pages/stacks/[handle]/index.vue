<script setup lang="ts">
import type { StacksResponse } from '#shared/types'

const route = useRoute()

const handle = computed(() => String(route.params.handle ?? '').replace(/^@/, ''))

const { data, error, status } = await useFetch<StacksResponse>(() => `/api/v1/stacks/${encodeURIComponent(handle.value)}`, {
  key: () => `stacks-${handle.value}`,
})

const stacks = computed(() => data.value?.stacks ?? [])
const author = computed(() => stacks.value[0]?.author)

const families = computed(() => [...new Set(stacks.value.flatMap(entry => entry.stack.roles.map(role => role.family)))].slice(0, 40))

useHead(() => ({
  link: families.value.length
    ? [{ rel: 'stylesheet', href: `/api/v1/css?families=${families.value.map(encodeURIComponent).join(',')}` }]
    : [],
}))

useProviderPreconnect()

usePageSeo({
  title: () => `Stacks by @${handle.value}`,
  description: () => `Font stacks @${handle.value} has published from their own account.`,
})
</script>

<template>
  <div class="profile">
    <header class="head">
      <h1 class="head__title">
        <img
          v-if="author?.avatar"
          class="head__avatar"
          :src="author.avatar"
          alt=""
          width="48"
          height="48"
        >
        {{ author?.displayName || `@${handle}` }}
      </h1>
      <p class="head__lede">
        Read from
        <a :href="`https://pdsls.dev/at://${author?.did ?? handle}`">their account</a>, not from
        anything stored here. <a :href="`https://bsky.app/profile/${handle}`">@{{ handle }}</a>
      </p>
    </header>

    <p
      v-if="error"
      class="warning"
    >
      No account answers to <code>{{ handle }}</code>.
    </p>

    <template v-else-if="status === 'pending'">
      <p
        class="visually-hidden"
        role="status"
      >
        Reading their account…
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
      Nothing published yet.
    </p>

    <StackCard
      v-for="entry in stacks"
      :key="entry.rkey"
      :entry="entry"
    />
  </div>
</template>

<style scoped>
.profile {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  font-size: var(--text-2xl);
}

.head__avatar {
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 50%;
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
