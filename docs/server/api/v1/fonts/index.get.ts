import type { ProviderName } from '../../../utils/unifont'
import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'
import { searchCatalogue } from '../../../utils/catalogue'
import { PROVIDER_NAMES } from '../../../utils/unifont'

export default defineEventHandler(async (event) => {
  const { q, provider, limit, offset } = getQuery(event)

  if (provider && !PROVIDER_NAMES.includes(provider as ProviderName)) {
    throw new HTTPError({ statusCode: 400, statusMessage: `Unknown provider \`${provider}\`.` })
  }

  // npm is the whole registry and Adobe needs a project id, so neither has a library to filter.
  if (provider === 'npm' || provider === 'adobe') {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: `\`${provider}\` cannot list its families, so the catalogue cannot be filtered by it. Resolve a family by name instead.`,
    })
  }

  const result = await searchCatalogue({
    query: typeof q === 'string' ? q : '',
    provider: provider as ProviderName | undefined,
    limit: Math.min(Number(limit) || 60, 200),
    offset: Math.max(Number(offset) || 0, 0),
  })

  event.res.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=3600')
  return result
})
