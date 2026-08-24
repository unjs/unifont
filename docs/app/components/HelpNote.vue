<script setup lang="ts">
defineProps<{
  /** The question the marker answers, used as its accessible name. */
  question: string
  href: string
  linkLabel: string
}>()
</script>

<template>
  <details class="help">
    <!-- The question names the marker as text rather than an `aria-label`, which would replace the
         visible glyph and leave voice control with nothing to say. -->
    <summary class="help__marker">
      <span aria-hidden="true">?</span>
      <span class="visually-hidden">{{ question }}</span>
    </summary>
    <span class="help__answer">
      <slot />
      <a
        class="help__link"
        :href="href"
      >{{ linkLabel }}</a>
    </span>
  </details>
</template>

<style scoped>
/* A `<details>` rather than a tooltip: it works on tap, without JavaScript, and is focusable. */
.help {
  display: inline-block;
  position: relative;
}

.help__marker {
  display: inline-grid;
  position: relative;
  place-items: center;
  width: 1.05rem;
  height: 1.05rem;
  /* The circle is the whole affordance, so its rule carries 1.4.11's 3:1. */
  border: var(--rule-hair) solid var(--color-neutral);
  border-radius: var(--radius-pill);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1;
  cursor: help;
  list-style: none;
  user-select: none;
}

.help__marker::-webkit-details-marker {
  display: none;
}

/* The glyph reads at 1.05rem; the target around it is 24px square (SC 2.5.8). */
.help__marker::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  translate: -50% -50%;
}

.help__marker:hover,
.help[open] .help__marker {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.help__answer {
  position: absolute;
  z-index: var(--z-tooltip);
  top: calc(100% + var(--space-2xs));
  left: 0;
  width: max-content;
  max-width: min(22rem, calc(100vw - 2 * var(--page-pad)));
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-paper);
  border: var(--rule-hair) solid var(--color-rule-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-whisper);
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-body);
  line-height: 1.5;
  text-wrap: pretty;
}

.help__link {
  display: block;
  margin-top: var(--space-2xs);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* For markers near the right edge, where the panel would run off screen. */
.help--end .help__answer {
  right: 0;
  left: auto;
}
</style>
