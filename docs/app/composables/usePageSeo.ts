import type { MaybeRefOrGetter } from 'vue'

interface PageSeo {
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
}

/** The site suffix `titleTemplate` adds to `<title>`, which `og:title` has to carry itself. */
export function withSiteName(title?: string) {
  return title ? `${title} · unifont` : 'unifont'
}

/**
 * A page's title and description, plus the Open Graph pair that mirrors them. `useSeoMeta` sets
 * only the document metadata, and `og:*` is what a share card reads.
 */
export function usePageSeo(meta: PageSeo) {
  const title = () => toValue(meta.title)
  const description = () => toValue(meta.description)

  // Only `<title>` has to keep up with a client-side navigation; a share card reads the rest
  // from the server-rendered document alone.
  useSeoMeta({ title })

  if (import.meta.server) {
    useSeoMeta({
      description,
      ogTitle: () => withSiteName(title()),
      ogDescription: description,
    })
  }
}
