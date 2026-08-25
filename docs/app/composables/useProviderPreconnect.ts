/**
 * Warms a connection to the CDNs that host the faces a page is about to set. For the pages that
 * link a provider stylesheet only: the URLs inside it are unknown until it has been parsed, so
 * without this the connection is opened two round trips after the document.
 */
export function useProviderPreconnect() {
  useHead({
    link: [
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
      { rel: 'preconnect', href: 'https://cdn.fontshare.com', crossorigin: 'anonymous' },
      { rel: 'preconnect', href: 'https://fonts.bunny.net', crossorigin: 'anonymous' },
    ],
  })
}
