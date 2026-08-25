<script setup lang="ts">
import type { ContributorsResponse } from '#shared/types'

// Server-rendered: a client-only credit line lands after hydration and pushes the colophon down.
// Only the count survives into the payload; the avatars and profiles are not drawn here.
const { data: credits } = await useFetch('/api/v1/contributors', {
  key: 'footer-contributors',
  /** Named in the template: danielroe, qwerzl, florian-lefebvre. Zero when GitHub is rate-limited. */
  transform: (response: ContributorsResponse) => ({ others: Math.max(0, (response.contributors?.length ?? 0) - 3) }),
})

const others = computed(() => credits.value?.others ?? 0)
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
        <NuxtLink to="/about">about</NuxtLink> ·
        <NuxtLink to="/contact">contact</NuxtLink> ·
        <NuxtLink to="/privacy">privacy</NuxtLink> ·
        <a href="https://github.com/unjs/unifont">source</a> ·
        <a href="https://npmjs.com/package/unifont">npm</a> ·
        <a href="/llms.txt">llms.txt</a> ·
        <a href="/openapi.json">openapi.json</a>
      </p>

      <p class="colophon__line colophon__line--fine">
        made with <span
          class="heart"
          role="img"
          aria-label="love"
        >&hearts;</span> by
        <a href="https://roe.dev">danielroe</a>, <a href="https://github.com/qwerzl">qwerzl</a><template v-if="others">, </template><template v-else> and </template><a href="https://florian-lefebvre.dev/">florian-lefebvre</a><template v-if="others">
          and <a href="https://github.com/unjs/unifont/graphs/contributors">{{ others }} other contributor{{ others === 1 ? '' : 's' }}</a>
        </template> ·
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
  flex-direction: column;
  gap: var(--space-2xs);
  margin-block: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.credits__row {
  display: flex;
  gap: var(--space-2xs);
  flex-wrap: wrap;
  min-height: 28px;
}

.credits__summary {
  color: var(--color-neutral);
  font-size: var(--text-xs);
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

.credits__row:hover .credits__avatar {
  filter: none;
  opacity: 1;
}

.heart {
  color: var(--color-accent);
}
</style>
