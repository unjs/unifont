<script setup lang="ts">
const palette = useCommandPalette()
const shortcut = useCommandShortcut()
const route = useRoute()

const links = [
  { to: '/fonts', label: 'Fonts' },
  { to: '/compare', label: 'Compare' },
  { to: '/docs', label: 'Docs' },
  { to: '/api', label: 'API' },
] as const

function isCurrent(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <header class="bar">
    <div class="bar__inner">
      <NuxtLink
        class="wordmark"
        to="/"
      >unifont<span
        class="wordmark__dot"
        aria-hidden="true"
      >.</span></NuxtLink>

      <button
        class="pill"
        type="button"
        @click="palette.open()"
      >
        <span class="pill__label">Search every provider</span>
        <!-- Vue condenses whitespace between elements, so the separator is explicit or the two
             labels concatenate in the accessible name and in extracted text. -->
        {{ ' ' }}
        <kbd class="pill__hint">{{ shortcut }}</kbd>
      </button>

      <nav
        class="nav"
        aria-label="Primary"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          class="nav__link"
          :class="{ 'nav__link--current': isCurrent(link.to) }"
          :aria-current="isCurrent(link.to) ? 'page' : undefined"
          :to="link.to"
        >{{ link.label }}</NuxtLink>
        <a
          class="nav__link nav__link--out"
          href="https://github.com/unjs/unifont"
        >GitHub</a>
      </nav>
    </div>
    <CommandPalette />
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: color-mix(in oklab, var(--color-paper) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.bar__inner {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  max-width: var(--page-max);
  margin-inline: auto;
  padding: var(--space-sm) var(--page-pad);
}

.wordmark {
  flex: none;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: var(--weight-display);
  letter-spacing: -0.03em;
  text-decoration: none;
  color: var(--color-ink-strong);
}

/* The mark the favicon draws, and not part of the name, so it is not read out. */
.wordmark__dot {
  color: var(--color-accent);
}

.pill {
  display: flex;
  flex: 1;
  gap: var(--space-sm);
  align-items: center;
  justify-content: space-between;
  max-width: 22rem;
  padding: var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm);
  background: var(--color-paper-2);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition:
    border-color var(--dur-micro) var(--ease-out),
    background-color var(--dur-micro) var(--ease-out);
}

.pill:hover {
  border-color: var(--color-rule-strong);
  background: var(--color-paper);
}

.pill:active {
  transform: translateY(1px);
}

.pill__label {
  overflow: hidden;
  color: var(--color-muted);
  font-size: var(--text-sm);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pill__hint {
  flex: none;
  padding: 1px var(--space-2xs);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-xs);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.nav {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  /* At 320px the five links do not fit on one line, and hiding one is content lost. */
  flex-wrap: wrap;
  margin-left: auto;
}

/* Standalone links, so they take the WCAG 2.2 2.5.8 minimum rather than the inline exception. */
.nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  color: var(--color-muted);
  font-size: var(--text-sm);
  font-weight: var(--weight-body-strong);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--dur-micro) var(--ease-out);
}

.nav__link:hover {
  color: var(--color-ink);
}

.nav__link--current {
  color: var(--color-ink-strong);
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

@media (width < 48rem) {
  .bar__inner {
    flex-wrap: wrap;
  }

  .pill {
    order: 3;
    max-width: none;
  }

  .nav {
    gap: var(--space-sm);
  }

  .pill__label {
    font-size: var(--text-xs);
  }
}
</style>
