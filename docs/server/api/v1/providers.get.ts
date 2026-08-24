import type { ProvidersResponse } from '#shared/types'
import { defineCachedHandler } from 'nitro/cache'
import { useCatalogue } from '../../utils/catalogue'
import { PROVIDER_META, PROVIDER_NAMES } from '../../utils/unifont'

export default defineCachedHandler(async (): Promise<ProvidersResponse> => {
  const catalogue = await useCatalogue()
  const counts = new Map<string, number>()
  for (const entry of catalogue.entries) {
    for (const provider of entry.providers) {
      counts.set(provider, (counts.get(provider) ?? 0) + 1)
    }
  }

  return {
    providers: PROVIDER_NAMES.map(name => ({
      ...PROVIDER_META[name],
      /** `null` when the provider cannot enumerate its library. */
      families: counts.get(name) ?? null,
      unavailable: catalogue.unavailable.includes(name),
    })),
  }
}, { maxAge: 60 * 60, name: 'providers', getKey: () => 'all' })
