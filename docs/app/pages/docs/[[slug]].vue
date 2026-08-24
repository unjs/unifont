<script setup lang="ts">
import type { MarkdownDocumentProps } from '@comark/vue'
import { MarkdownDocument } from '@comark/vue'
import { clientContent } from '~/composables/client-content'

const route = useRoute()

const path = computed(() => {
  const slug = route.params.slug
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : []
  return parts.length ? `/${parts.join('/')}` : '/'
})

const { data: page } = await useAsyncData(() => `doc:${path.value}`, () => clientContent.get(path.value), {
  watch: [path],
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'No such page in the docs.' })
}

const { data: nav } = await useAsyncData('doc-nav', () => clientContent.navigation())

interface NavItem { title?: string, path: string, children?: NavItem[] }

const chapters = computed<NavItem[]>(() => {
  const items = (nav.value ?? []) as NavItem[]
  const flat: NavItem[] = []
  const walk = (list: NavItem[]) => {
    for (const item of list) {
      if (item.path) {
        flat.push(item)
      }
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }
  walk(items)
  return flat
})

const position = computed(() => chapters.value.findIndex(item => item.path === path.value))
const previous = computed(() => (position.value > 0 ? chapters.value[position.value - 1] : undefined))
const next = computed(() =>
  position.value >= 0 && position.value < chapters.value.length - 1
    ? chapters.value[position.value + 1]
    : undefined,
)

const components = {
  pre: resolveComponent('ProsePre'),
  table: resolveComponent('ProseTable'),
  th: resolveComponent('ProseTh'),
}

const title = computed(() => (page.value?.data.title as string | undefined) ?? 'Docs')

// `ContentFile` carries the `nodes` the renderer wants, but the two types are declared in
// different packages and do not structurally line up.
const document = computed(() => page.value as MarkdownDocumentProps['value'])

usePageSeo({
  title: () => title.value,
  description: () => (page.value?.data.description as string | undefined) ?? undefined,
})

const href = (docPath: string) => (docPath === '/' ? '/docs' : `/docs${docPath}`)
</script>

<template>
  <div class="docs">
    <nav
      class="rail"
      aria-label="Documentation"
    >
      <p class="rail__title">
        Documentation
      </p>
      <ol class="rail__list">
        <li
          v-for="item in chapters"
          :key="item.path"
        >
          <NuxtLink
            class="rail__link"
            :class="{ 'rail__link--current': item.path === path }"
            :aria-current="item.path === path ? 'page' : undefined"
            :to="href(item.path)"
          >{{ item.title }}</NuxtLink>
        </li>
      </ol>
    </nav>

    <article class="doc">
      <header class="doc__head">
        <h1 class="doc__title">
          {{ title }}
        </h1>
        <p
          v-if="page?.data.description"
          class="doc__lede"
        >
          {{ page.data.description }}
        </p>
      </header>

      <div class="doc__body">
        <MarkdownDocument
          :value="document"
          :components="components"
        />
      </div>

      <nav
        class="pager"
        aria-label="Adjacent pages"
      >
        <NuxtLink
          v-if="previous"
          class="pager__link"
          :to="href(previous.path)"
        >
          <span class="pager__dir">previous</span>
          <span class="pager__name">{{ previous.title }}</span>
        </NuxtLink>
        <NuxtLink
          v-if="next"
          class="pager__link pager__link--next"
          :to="href(next.path)"
        >
          <span class="pager__dir">next</span>
          <span class="pager__name">{{ next.title }}</span>
        </NuxtLink>
      </nav>
    </article>
  </div>
</template>

<style scoped>
.docs {
  display: grid;
  /* The document column is capped at its measure, so prose and code share one edge. */
  grid-template-columns: 13rem minmax(0, 46rem);
  gap: var(--space-2xl) var(--space-3xl);
  justify-content: start;
  max-width: var(--page-max);
  margin-inline: auto;
  padding: var(--space-xl) var(--page-pad) 0;
}

/* ── Rail ─────────────────────────────────────────────────── */
.rail {
  position: sticky;
  top: 5rem;
  align-self: start;
}

.rail__title {
  margin-bottom: var(--space-sm);
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.rail__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: chapter;
}

.rail__link {
  display: block;
  padding: var(--space-2xs) 0 var(--space-2xs) var(--space-sm);
  border-left: var(--rule-heavy) solid var(--color-rule);
  color: var(--color-muted);
  font-size: var(--text-sm);
  text-decoration: none;
  transition:
    color var(--dur-micro) var(--ease-out),
    border-color var(--dur-micro) var(--ease-out);
}

.rail__link:hover {
  border-left-color: var(--color-rule-strong);
  color: var(--color-ink);
}

.rail__link--current {
  border-left-color: var(--color-accent);
  color: var(--color-ink-strong);
}

/* ── Document ─────────────────────────────────────────────── */
.doc {
  min-width: 0;
  padding-bottom: var(--space-2xl);
}

.doc__head {
  padding-bottom: var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.doc__title {
  font-size: var(--text-2xl);
}

.doc__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-md);
  line-height: 1.5;
}

.doc__body {
  padding-top: var(--space-lg);
}

.doc__body :deep(p),
.doc__body :deep(ul),
.doc__body :deep(ol),
.doc__body :deep(blockquote) {
  margin-block: var(--space-md);
  color: var(--color-muted);
}

.doc__body :deep(h2) {
  margin-block: var(--space-2xl) var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
  font-size: var(--text-lg);
}

.doc__body :deep(h3) {
  margin-block: var(--space-xl) var(--space-xs);
  font-size: var(--text-md);
}

.doc__body :deep(h4) {
  margin-block: var(--space-lg) var(--space-xs);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-body-strong);
}

.doc__body :deep(ul),
.doc__body :deep(ol) {
  padding-left: var(--space-lg);
}

.doc__body :deep(li) {
  margin-block: var(--space-2xs);
}

.doc__body :deep(li::marker) {
  color: var(--color-rule-strong);
}

.doc__body :deep(a) {
  text-decoration-color: var(--color-muted);
}

.doc__body :deep(code) {
  padding: 0.1em 0.25em;
  background: var(--color-paper-3);
  border-radius: var(--radius-xs);
}

.doc__body :deep(pre code) {
  padding: 0;
  background: none;
}

.doc__body :deep(blockquote) {
  padding-left: var(--space-md);
  border-left: var(--rule-heavy) solid var(--color-rule-strong);
  font-style: italic;
}

.doc__body :deep(table) {
  width: 100%;
  margin-block: var(--space-lg);
  border-collapse: collapse;
  font-size: var(--text-sm);
  text-align: left;
}

.doc__body :deep(th),
.doc__body :deep(td) {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  vertical-align: top;
}

.doc__body :deep(th) {
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Undo the uppercasing above: `resolveFont()` should not read as RESOLVEFONT. */
.doc__body :deep(th code) {
  letter-spacing: 0;
  text-transform: none;
  /* Column heads are `--color-neutral` at `--text-xs`, which falls under 4.5:1 on the raised
     code surface. */
  background: none;
}

.doc__body :deep(hr) {
  margin-block: var(--space-2xl);
  border: 0;
  border-top: var(--rule-hair) solid var(--color-rule);
}

/* ── Pager ────────────────────────────────────────────────── */
.pager {
  display: flex;
  gap: var(--space-lg);
  justify-content: space-between;
  margin-top: var(--space-3xl);
  padding-top: var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.pager__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  text-decoration: none;
}

.pager__link--next {
  margin-left: auto;
  text-align: right;
}

.pager__dir {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.pager__name {
  font-family: var(--font-display);
  font-size: var(--text-md);
}

.pager__link:hover .pager__name {
  color: var(--color-ink-strong);
}

/* ── Collapse ─────────────────────────────────────────────── */
@media (width < 60rem) {
  .docs {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xl);
  }

  .rail {
    position: static;
    padding-bottom: var(--space-md);
    border-bottom: var(--rule-hair) solid var(--color-rule);
  }

  .rail__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr));
  }
}
</style>
