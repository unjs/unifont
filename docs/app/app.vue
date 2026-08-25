<script setup lang="ts">
const DESCRIPTION = 'Look up a typeface across every font CDN in one place: metadata, specimens, coverage, and the CSS to ship it.'

// The template has to survive into the client, where a navigation sets a title through it.
useSeoMeta({
  titleTemplate: title => withSiteName(title ?? undefined),
})

if (import.meta.server) {
  useSeoMeta({
    description: DESCRIPTION,
    ogType: 'website',
    ogSiteName: 'unifont',
    ogTitle: 'unifont',
    ogDescription: DESCRIPTION,
  })
}

/*
 * Share cards mirror the route: `/fonts/Fraunces` is drawn by `/og/fonts/Fraunces.png`, which
 * sets the family in its own face. Set once here so every page gets one without repeating itself.
 */
const route = useRoute()
// Crawlers resolve `og:image` against nothing, so it has to be absolute. `NUXT_PUBLIC_SITE_URL`
// covers deployments where the request origin is a proxy or a prerender host.
const origin = useRuntimeConfig().public.siteUrl || useRequestURL().origin
const ogImage = computed(() => {
  const path = route.path.replace(/^\/+|\/+$/g, '')
  return new URL(`/og/${path || 'index'}.png`, origin).href
})

if (import.meta.server) {
  useSeoMeta({
    ogImage: () => ogImage.value,
    ogImageWidth: 1200,
    ogImageHeight: 630,
  })
}

/** Prose routes with a markdown twin. */
const PROSE = /^\/(?:$|fonts$|compare$|api$|about$|contact$|privacy$|docs)/

const canonical = computed(() => new URL(route.path, origin).href)

if (import.meta.server) {
  useHead({
    link: [{ rel: 'canonical', href: () => canonical.value }],
  })

  // <https://acceptmarkdown.com>: the same document, negotiable through `Accept` or the suffix.
  if (PROSE.test(route.path)) {
    const markdown = route.path === '/' ? '/index.md' : `${route.path.replace(/\/$/, '')}.md`
    useHead({ link: [{ rel: 'alternate', type: 'text/markdown', href: new URL(markdown, origin).href }] })
  }
}

const main = useTemplateRef<HTMLElement>('main')

// Reset focus to the main landmark after a client-side navigation, which otherwise leaves the
// reader on a link that no longer exists. `afterEach`, not `page:finish`, to leave first paint alone.
if (import.meta.client) {
  useRouter().afterEach(async (to, from) => {
    if (to.path === from.path) {
      return
    }
    await nextTick()
    // Focusing scrolls into view, and `<main>` starts below the sticky header.
    main.value?.focus({ preventScroll: true })
  })
}
</script>

<template>
  <div class="shell">
    <NuxtRouteAnnouncer />
    <a
      class="skip"
      href="#main"
    >Skip to content</a>
    <SiteHeader />
    <main
      id="main"
      ref="main"
      class="main"
      tabindex="-1"
    >
      <NuxtPage />
    </main>
    <LazySiteFooter hydrate-on-visible />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
}

/* Only ever focused programmatically, so a ring here would mark a region nobody is navigating. */
.main:focus:not(:focus-visible) {
  outline: none;
}
</style>
