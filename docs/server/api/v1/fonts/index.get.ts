import type { ProviderName } from '../../../utils/unifont'
import { createError, defineEventHandler, getQuery, setResponseHeader } from 'nitro/h3'
import { searchCatalogue } from '../../../utils/catalogue'
import { PROVIDER_NAMES } from '../../../utils/unifont'

export default defineEventHandler(async (event) => {
  const { q, provider, limit, offset } = getQuery(event)

  if (provider && !PROVIDER_NAMES.includes(provider as ProviderName)) {
    throw createError({ statusCode: 400, statusMessage: `Unknown provider \`${provider}\`.` })
  }

  const result = await searchCatalogue({
    query: typeof q === 'string' ? q : '',
    provider: provider as ProviderName | undefined,
    limit: Math.min(Number(limit) || 60, 200),
    offset: Math.max(Number(offset) || 0, 0),
  })

  setResponseHeader(event, 'cache-control', 'public, max-age=300, stale-while-revalidate=3600')
  return result
})
