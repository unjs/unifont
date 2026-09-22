<script setup lang="ts">
const palette = useCommandPalette()
const route = useRoute()

const links = [
  { to: '/fonts', label: 'Fonts' },
  { to: '/stacks', label: 'Stacks' },
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
        <CommandShortcut class="pill__hint" />
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
        ><svg
          class="nav__mark"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        ><path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        /></svg><span class="nav__out-label">GitHub</span></a>
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

.nav__mark {
  display: none;
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

  /* The mark carries the link on narrow viewports; the name stays for assistive tech. */
  .nav__mark {
    display: block;
  }

  .nav__link--out {
    min-inline-size: 1.5rem;
    justify-content: center;
  }

  .nav__out-label {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .pill__label {
    font-size: var(--text-xs);
  }
}
</style>
