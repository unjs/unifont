import { clientMetadata } from 'airspace/oauth/metadata'
import { OAUTH_CLIENT } from '#shared/atproto'
import { STACK_SCOPES } from '#shared/collections'
import { defineEventHandler } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

export default defineEventHandler((event) => {
  event.res.headers.set('cache-control', 'public, max-age=3600')
  return clientMetadata({
    baseUrl: useRuntimeConfig().public.siteUrl || 'http://127.0.0.1:3000',
    ...OAUTH_CLIENT,
    scopes: STACK_SCOPES,
  })
})
