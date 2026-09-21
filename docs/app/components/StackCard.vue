<script setup lang="ts">
import type { PublishedStack } from '#shared/types'
import { stackPath } from '#shared/atproto'

/** Without an `entry` the card renders as a placeholder of the height it will fill. */
const props = defineProps<{ entry?: PublishedStack }>()

const roles = computed(() => {
  const byRole = new Map(props.entry?.stack.roles.map(role => [role.role, role]))
  return { heading: byRole.get('heading'), body: byRole.get('body'), mono: byRole.get('mono') }
})

const stackFor = (family: string | undefined, fallback: string) =>
  (family ? `'${family}', ${fallback}` : fallback)
</script>

<template>
  <article
    class="card"
    :class="{ 'card--loading': !entry }"
    :aria-hidden="entry ? undefined : 'true'"
  >
    <p
      class="card__heading"
      :style="{ fontFamily: stackFor(roles.heading?.family, 'var(--font-display)') }"
    >
      <template v-if="entry">
        {{ entry.stack.title }}
      </template>
      <span
        v-else
        class="card__bar"
        style="inline-size: 62%"
      />
    </p>

    <p
      class="card__body"
      :style="{ fontFamily: stackFor(roles.body?.family, 'var(--font-body)') }"
    >
      <template v-if="entry">
        {{ entry.stack.note || 'Set in the body face, at the size a page would actually use it.' }}
      </template>
      <template v-else>
        <span
          class="card__bar"
          style="inline-size: 100%"
        />
        <span
          class="card__bar"
          style="inline-size: 43%"
        />
      </template>
    </p>

    <p
      class="card__mono"
      :style="{ fontFamily: stackFor(roles.mono?.family, 'var(--font-mono)') }"
    >
      <template v-if="entry">
        <template v-if="roles.mono">const weight = 400 // 0123456789</template>
      </template>
      <span
        v-else
        class="card__bar"
        style="inline-size: 34%"
      />
    </p>

    <p class="card__roles">
      <template v-if="entry">
        <template
          v-for="role in entry.stack.roles"
          :key="role.role"
        >
          <span class="card__role">{{ role.role }}</span>
          <NuxtLink :to="`/fonts/${encodeURIComponent(role.family)}`">{{ role.family }}</NuxtLink>
          <span
            class="card__sep"
            aria-hidden="true"
          > · </span>
        </template>
      </template>
      <span
        v-else
        class="card__bar"
        style="inline-size: 48%"
      />
    </p>

    <p class="card__by">
      <template v-if="entry">
        <NuxtLink :to="stackPath(entry.author.handle, entry.rkey)">
          {{ entry.stack.title }}
        </NuxtLink>
        by
        <NuxtLink :to="`/stacks/@${entry.author.handle}`">@{{ entry.author.handle }}</NuxtLink>
      </template>
      <span
        v-else
        class="card__bar"
        style="inline-size: 30%"
      />
    </p>
  </article>
</template>

<style scoped>
/* Line-box limits keep every card one height. */
.card {
  min-inline-size: 0;
  padding-block: var(--space-lg);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.card__heading {
  block-size: 1lh;
  overflow: hidden;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__body {
  display: -webkit-box;
  block-size: 2lh;
  max-width: var(--measure);
  margin-top: var(--space-xs);
  overflow: hidden;
  font-size: var(--text-sm);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.card__mono {
  block-size: 1lh;
  margin-top: var(--space-2xs);
  overflow: hidden;
  font-size: var(--text-xs);
  white-space: nowrap;
}

.card__roles,
.card__by {
  block-size: 1lh;
  margin-top: var(--space-xs);
  overflow: hidden;
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__role {
  margin-inline-end: var(--space-2xs);
}

.card__roles > :last-child.card__sep {
  display: none;
}

.card--loading .card__body {
  display: block;
}

.card__bar {
  display: inline-block;
  block-size: 0.62em;
  vertical-align: middle;
  background: var(--color-rule);
}

@media (prefers-reduced-motion: no-preference) {
  .card--loading .card__bar {
    animation: card-bar var(--dur-long) var(--ease-out) infinite alternate;
  }
}

@keyframes card-bar {
  to {
    opacity: 0.45;
  }
}
</style>
