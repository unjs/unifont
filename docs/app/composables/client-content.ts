import { createContentClient } from 'comark-content/client'

export const clientContent = createContentClient({
  /*
   * `responseType: 'json'` rather than a bare `$fetch`: the endpoints are prerendered to
   * extensionless files, and a page whose own prerender runs after one of them is handed that
   * file with no content type, which `ofetch` leaves as a string.
   */
  fetch: (request, options) => $fetch(request as string, { ...options, responseType: 'json' }),
})
