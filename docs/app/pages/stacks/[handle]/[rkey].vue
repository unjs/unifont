<script setup lang="ts">
import type { PublishedStack } from '#shared/types'

const route = useRoute()

const handle = computed(() => String(route.params.handle ?? '').replace(/^@/, ''))
const rkey = computed(() => String(route.params.rkey ?? ''))

const { data: entry, error } = await useFetch<PublishedStack>(
  () => `/api/v1/stacks/${encodeURIComponent(handle.value)}/${encodeURIComponent(rkey.value)}`,
  { key: () => `stack-${handle.value}-${rkey.value}` },
)

const families = computed(() => entry.value?.stack.roles.map(role => role.family) ?? [])

useProviderPreconnect()

usePageSeo({
  title: () => entry.value?.stack.title ?? 'Stack',
  description: () => `A font stack published by @${handle.value}: ${families.value.join(', ')}.`,
})

const { session } = useAtprotoSession()

const mine = computed(() => !!session.value && session.value.did === entry.value?.author.did)

/** Asks once before deleting, since the record is the only copy. */
const removal = ref<'idle' | 'confirming' | 'deleting' | 'failed'>('idle')

async function remove() {
  const signedIn = session.value
  if (!signedIn || !entry.value) {
    return
  }
  if (removal.value === 'idle') {
    removal.value = 'confirming'
    return
  }

  removal.value = 'deleting'
  try {
    await signedIn.airspace.stacks.delete(entry.value.rkey)
    await navigateTo(`/stacks/@${signedIn.handle}`)
  }
  catch {
    removal.value = 'failed'
  }
}

const asQuery = computed(() => {
  const query: Record<string, string> = {}
  for (const role of entry.value?.stack.roles ?? []) {
    query[role.role] = role.family
  }
  return query
})

/** The builder writes back to this record rather than adding another. */
const editQuery = computed(() => ({ ...asQuery.value, rkey: rkey.value }))

const published = computed(() => {
  const at = entry.value?.stack.createdAt
  return at ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
})
</script>

<template>
  <div class="single">
    <p
      v-if="error"
      class="warning"
    >
      No stack here. It may have been deleted from its author’s account.
    </p>

    <template v-else-if="entry">
      <header class="head">
        <h1 class="head__title">
          {{ entry.stack.title }}
        </h1>
        <p class="head__by">
          by <NuxtLink :to="`/stacks/@${entry.author.handle}`">@{{ entry.author.handle }}</NuxtLink>
          <template v-if="published"> · {{ published }}</template>
        </p>
        <p
          v-if="entry.stack.note"
          class="head__note"
        >
          {{ entry.stack.note }}
        </p>
      </header>

      <StackPreview :roles="entry.stack.roles" />

      <p class="single__actions">
        <NuxtLink :to="{ path: '/stack', query: mine ? editQuery : asQuery }">
          {{ mine ? 'edit in the builder' : 'open in the builder' }}
        </NuxtLink>
        ·
        <a :href="`https://pdsls.dev/at://${entry.author.did}/dev.unifont.stack/${entry.rkey}`">
          view the record
        </a>
        <template v-if="mine">
          ·
          <button
            class="single__delete"
            type="button"
            :disabled="removal === 'deleting'"
            @click="remove()"
          >
            {{ removal === 'confirming' ? 'delete it for good?' : removal === 'deleting' ? 'deleting…' : 'delete from my account' }}
          </button>
        </template>
      </p>

      <p
        class="visually-hidden"
        role="status"
      >
        {{ removal === 'confirming' ? 'Press delete again to remove this stack from your account.' : '' }}
      </p>

      <p
        v-if="removal === 'failed'"
        class="warning"
        role="alert"
      >
        The delete didn’t go through. Try again, or remove the stack from anywhere else you can
        reach your account.
      </p>
    </template>
  </div>
</template>

<style scoped>
.single {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
  padding-block: var(--space-xl);
}

.head {
  padding-bottom: var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  font-size: var(--text-2xl);
}

.head__by,
.head__note {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.single__actions {
  margin-top: var(--space-md);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.single__delete {
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-rule-strong);
  text-underline-offset: 0.2em;
  cursor: pointer;
}

.single__delete:hover:not(:disabled) {
  color: var(--color-negative);
}

.warning {
  margin-top: var(--space-md);
  color: var(--color-muted);
  font-size: var(--text-sm);
}
</style>
