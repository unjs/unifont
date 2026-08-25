<script setup lang="ts">
import type { MarkdownDocumentProps } from '@comark/vue'
import { MarkdownDocument } from '@comark/vue'
import { clientContent } from '~/composables/client-content'

const props = defineProps<{ slug: string }>()

const { data: page } = await useAsyncData(() => `page:${props.slug}`, () => clientContent.get(`/${props.slug}`))

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'No such page.' })
}

const components = {
  pre: resolveComponent('ProsePre'),
  table: resolveComponent('ProseTable'),
  th: resolveComponent('ProseTh'),
}

const title = computed(() => (page.value?.data.title as string | undefined) ?? 'unifont')
const description = computed(() => page.value?.data.description as string | undefined)

// `ContentFile` carries the `nodes` the renderer wants, but the two types are declared in
// different packages and do not structurally line up.
const document = computed(() => page.value as MarkdownDocumentProps['value'])

usePageSeo({ title: () => title.value, description: () => description.value })
</script>

<template>
  <article class="page">
    <header class="page__head">
      <h1 class="page__title">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="page__lede"
      >
        {{ description }}
      </p>
    </header>

    <div class="page__body">
      <MarkdownDocument
        :value="document"
        :components="components"
      />
    </div>
  </article>
</template>

<style scoped>
.page {
  max-width: 46rem;
  margin-inline: auto;
  padding: var(--space-xl) var(--page-pad) var(--space-2xl);
}

.page__head {
  padding-bottom: var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.page__title {
  font-size: var(--text-2xl);
}

.page__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-md);
  line-height: 1.5;
}

.page__body {
  padding-top: var(--space-lg);
}

.page__body :deep(p),
.page__body :deep(ul),
.page__body :deep(ol) {
  margin-block: var(--space-md);
  color: var(--color-muted);
}

.page__body :deep(h2) {
  margin-block: var(--space-2xl) var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
  font-size: var(--text-lg);
}

.page__body :deep(h3) {
  margin-block: var(--space-xl) var(--space-xs);
  font-size: var(--text-md);
}

.page__body :deep(ul),
.page__body :deep(ol) {
  padding-left: var(--space-lg);
}

.page__body :deep(li) {
  margin-block: var(--space-2xs);
}

.page__body :deep(li::marker) {
  color: var(--color-rule-strong);
}

.page__body :deep(a) {
  text-decoration-color: var(--color-muted);
}

.page__body :deep(code) {
  padding: 0.1em 0.25em;
  background: var(--color-paper-3);
  border-radius: var(--radius-xs);
}
</style>
