import { defineEventHandler } from 'nitro/h3'
import { useCatalogue } from '../../utils/catalogue'
import { PROVIDER_META, QUERYABLE_PROVIDERS } from '../../utils/unifont'

/** What the resolver knows right now. Every value is measured rather than configured. */
export default defineEventHandler(async (event) => {
  const catalogue = await useCatalogue()

  const answering = QUERYABLE_PROVIDERS
    .filter(name => !PROVIDER_META[name].requiresOptions && name !== 'npm')
    .filter(name => !catalogue.unavailable.includes(name))

  event.res.headers.set('cache-control', 'public, max-age=30')

  return {
    families: catalogue.entries.length,
    providers: answering.length,
    unavailable: catalogue.unavailable,
    /** Milliseconds since the merged index was built. */
    indexAge: Date.now() - catalogue.builtAt,
    crossListed: catalogue.entries.filter(entry => entry.providers.length > 1).length,
  }
})
