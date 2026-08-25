<script setup lang="ts">
import type { ContributorsResponse } from '#shared/types'

// Server-rendered: a client-only avatar row lands after hydration and pushes the colophon down.
const { data: credits } = await useFetch<ContributorsResponse>('/api/v1/contributors', {
  key: 'footer-contributors',
  // The colophon never hydrates, so the avatar list need not go into the payload.
  serialize: false,
})

const contributors = computed(() => credits.value?.contributors ?? [])
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
            <!-- The avatar carries no text of its own, so the link is labelled instead. -->
            <a
              class="credits__person"
              :href="person.url"
              :aria-label="`${person.login}, ${person.contributions} ${person.contributions === 1 ? 'commit' : 'commits'}`"
            >
              <img
                class="credits__avatar"
                :src="person.avatar"
                alt=""
                width="28"
                height="28"
                loading="lazy"
                decoding="async"
              >
            </a>
          </li>
        </ul>
        <a
          class="credits__all"
          href="https://github.com/unjs/unifont/graphs/contributors"
        >all contributors</a>
      </div>

      <p class="colophon__line colophon__line--fine">
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
  margin-top: var(--space-2xl);
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
  max-width: var(--measure);
  color: var(--color-muted);
  font-size: var(--text-sm);
  line-height: 1.65;
  text-wrap: pretty;
}

.colophon__line strong {
  color: var(--color-ink);
  font-weight: var(--weight-body-strong);
}

.colophon__line--index {
  color: var(--color-ink);
}

.colophon__line--fine {
  color: var(--color-neutral);
  font-size: var(--text-xs);
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

.credits__all {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
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
