import { createContentClient } from 'comark-content/client'

export const clientContent = createContentClient({
  fetch: $fetch,
})
