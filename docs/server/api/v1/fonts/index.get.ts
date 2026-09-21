import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import type { ProviderName } from '../../../utils/unifont'
import { searchCatalogue } from '../../../utils/catalogue'
import { PROVIDER_NAMES } from '../../../utils/unifont'

export default defineEventHandler(async (event) => {
  const { q, provider, variable, italic, subset, limit, offset } = getQuery(event)

  const flag = (value: unknown) => (value === undefined ? undefined : value !== '0' && value !== 'false')

  if (provider && !PROVIDER_NAMES.includes(provider as ProviderName)) {
    throw createError({ status: 400, statusText: `Unknown provider \`${provider}\`.` })
  }

  // npm is the whole registry and Adobe needs a project id, so neither has a library to filter.
  if (provider === 'npm' || provider === 'adobe') {
    throw createError({
      status: 400,
      statusText: `\`${provider}\` cannot list its families, so the catalogue cannot be filtered by it. Resolve a family by name instead.`,
    })
  }

  const result = await searchCatalogue({
    query: typeof q === 'string' ? q : '',
    provider: provider as ProviderName | undefined,
    variable: flag(variable),
    italic: flag(italic),
    subset: typeof subset === 'string' && subset ? subset : undefined,
    limit: Math.min(Number(limit) || 60, 200),
    offset: Math.max(Number(offset) || 0, 0),
  })

  event.res.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=3600')
  return result
})
