<script setup lang="ts">
import type { ContributorsResponse } from '#shared/types'

const { data } = await useProviders()

// Server-rendered: a client-only avatar row lands after hydration and pushes the colophon down.
const { data: credits } = await useFetch<ContributorsResponse>('/api/v1/contributors', {
  key: 'footer-contributors',
  // The colophon never hydrates, so the avatar list need not go into the payload.
  serialize: false,
})

const contributors = computed(() => credits.value?.contributors ?? [])

const providerLine = computed(() => {
  const providers = data.value?.providers ?? []
  if (!providers.length) {
    return null
  }
  return providers
    .map(provider => `${provider.name}${provider.families ? `(${provider.families.toLocaleString('en')})` : ''}`)
    .join(' · ')
})
</script>

<template>
  <footer class="colophon">
    <div class="colophon__inner">
      <p class="colophon__line">
        <strong>unifont</strong> is a small library for reading font metadata from CDNs, whatever you build with.
      </p>
      <p class="colophon__line colophon__line--index">
        <NuxtLink to="/fonts">fonts</NuxtLink> ·
        <NuxtLink to="/compare">compare</NuxtLink> ·
        <NuxtLink to="/docs">docs</NuxtLink> ·
        <NuxtLink to="/api">api</NuxtLink> ·
        <a href="https://github.com/unjs/unifont">source</a> ·
        <a href="https://npmjs.com/package/unifont">npm</a>
      </p>
      <p
        v-if="providerLine"
        class="colophon__line colophon__line--data"
      >
        providers indexed: {{ providerLine }}
      </p>
      <div
        v-if="contributors.length"
        class="credits"
      >
        <ul
          class="credits__list"
          aria-label="Contributors"
        >
          <li
            v-for="person in contributors"
            :key="person.login"
          >
            <!-- The avatar is the link, so its `alt` names the destination rather than the
                 picture, and carries the commit count. -->
            <a
              class="credits__person"
              :href="person.url"
            >
              <img
                class="credits__avatar"
                :src="person.avatar"
                :alt="`${person.login} on GitHub, ${person.contributions} commits`"
                width="28"
                height="28"
                loading="lazy"
                decoding="async"
              >
            </a>
          </li>
        </ul>
      </div>

      <p class="colophon__line colophon__line--data">
        made with <span
          class="heart"
          role="img"
          aria-label="love"
        >&hearts;</span> by
        <a href="https://roe.dev">Daniel Roe</a> and contributors ·
        MIT · font data belongs to its foundries and is licensed by them, not by us
      </p>
    </div>
  </footer>
</template>

<style scoped>
.colophon {
  margin-top: var(--space-4xl);
  border-top: var(--rule-heavy) solid var(--color-ink);
  background: var(--color-paper-2);
}

.colophon__inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-width: var(--page-max);
  margin-inline: auto;
  padding: var(--space-lg) var(--page-pad) var(--space-2xl);
}

.colophon__line {
  max-width: 78ch;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.75;
  text-wrap: pretty;
}

.colophon__line strong {
  color: var(--color-ink);
  font-weight: 500;
}

.colophon__line--index {
  color: var(--color-ink);
}

.colophon__line--data {
  overflow-wrap: anywhere;
}

.colophon a {
  color: inherit;
  text-decoration-color: var(--color-rule-strong);
}

.credits {
  display: flex;
  gap: var(--space-sm) var(--space-md);
  align-items: baseline;
  flex-wrap: wrap;
  margin-block: var(--space-xs);
}

.credits__list {
  display: flex;
  gap: var(--space-2xs);
  flex-wrap: wrap;
  min-height: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.credits__person {
  display: block;
  border-radius: var(--radius-pill);
  text-decoration: none;
  transition: transform var(--dur-micro) var(--ease-out);
}

.credits__person:hover {
  transform: translateY(-2px);
}

.credits__avatar {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-pill);
  /* Avatars are the only colour in the colophon, so they stay muted until hover. */
  filter: grayscale(1);
  opacity: 0.75;
  transition:
    filter var(--dur-short) var(--ease-out),
    opacity var(--dur-short) var(--ease-out);
}

.credits__person:hover .credits__avatar,
.credits__person:focus-visible .credits__avatar {
  filter: none;
  opacity: 1;
}

.heart {
  color: var(--color-accent);
}
</style>
