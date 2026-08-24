import type { ProviderMeta, ProviderName } from '#shared/types'
import { PROVIDER_NAMES } from '#shared/types'
import { useStorage } from 'nitro/storage'
import { createUnifont, providers } from 'unifont'

export type { ProviderMeta, ProviderName } from '#shared/types'
export { PROVIDER_NAMES } from '#shared/types'

export const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  google: { name: 'google', label: 'Google Fonts', origin: 'fonts.google.com', requiresOptions: false, note: 'The largest open library. Serves woff2, with a unicode range per subset.' },
  bunny: { name: 'bunny', label: 'Bunny Fonts', origin: 'fonts.bunny.net', requiresOptions: false, note: 'A privacy-minded mirror of the Google library. Same families, different CDN.' },
  fontshare: { name: 'fontshare', label: 'Fontshare', origin: 'api.fontshare.com', requiresOptions: false, note: 'Indian Type Foundry’s library, free for commercial use.' },
  fontsource: { name: 'fontsource', label: 'Fontsource', origin: 'api.fontsource.org', requiresOptions: false, note: 'Open fonts packaged for npm, served from jsDelivr.' },
  googleicons: { name: 'googleicons', label: 'Google Icons', origin: 'fonts.google.com', requiresOptions: false, note: 'Material Symbols, as variable icon fonts.' },
  adobe: { name: 'adobe', label: 'Adobe Fonts', origin: 'typekit.com', requiresOptions: true, note: 'Needs a Typekit project id, so this site can\'t ask it on your behalf.' },
  npm: { name: 'npm', label: 'npm', origin: 'unpkg / jsDelivr', requiresOptions: false, note: 'Any font published to npm, resolved from the CDN.' },
}

/** Providers this site can query without per-user credentials. */
export const QUERYABLE_PROVIDERS = PROVIDER_NAMES.filter(name => !PROVIDER_META[name].requiresOptions)

function nitroStorage(bucket = 'unifont') {
  const cache = useStorage(bucket)
  return {
    getItem: (key: string) => cache.getItem(key),
    setItem: (key: string, value: Parameters<typeof cache.setItem>[1]) => cache.setItem(key, value),
  }
}

let shared: ReturnType<typeof create> | undefined

function create() {
  return createUnifont([
    providers.google(),
    providers.bunny(),
    providers.fontshare(),
    providers.fontsource(),
    providers.googleicons(),
  ], { storage: nitroStorage() })
}

/** One shared instance, backed by storage so provider metadata survives a restart. */
export function useUnifont() {
  shared ??= create()
  return shared
}

const singles = new Map<string, ReturnType<typeof createSingle>>()

function createSingle(name: Exclude<ProviderName, 'adobe'>) {
  const factory = providers[name] as () => Parameters<typeof createUnifont>[0][number]
  return createUnifont([factory()], { storage: nitroStorage() })
}

/** A single-provider instance, so a comparison can attribute each answer to its source. */
export function useProvider(name: Exclude<ProviderName, 'adobe'>) {
  if (!singles.has(name)) {
    singles.set(name, createSingle(name))
  }
  return singles.get(name)!
}

type SharedProviderName = 'google' | 'bunny' | 'fontshare' | 'fontsource' | 'googleicons'

const SHARED_PROVIDERS: SharedProviderName[] = ['google', 'bunny', 'fontshare', 'fontsource', 'googleicons']

/**
 * Read the `provider` query parameter, a comma-separated list of the providers a request may
 * answer from. An absent or unrecognised value means every queryable provider.
 *
 * A single name gets its own instance, so `npm`, which the shared cascade does not register, can
 * still be asked directly. Several names narrow the cascade instead.
 */
export async function useProviderScope(value: unknown) {
  const requested = (typeof value === 'string' ? value.split(',').map(part => part.trim()) : [])
    .filter((name): name is Exclude<ProviderName, 'adobe'> =>
      name !== 'adobe' && QUERYABLE_PROVIDERS.includes(name as ProviderName))

  type Shared = Awaited<ReturnType<typeof useUnifont>>

  if (requested.length === 1) {
    return { unifont: await useProvider(requested[0]!) as Shared, allowed: undefined }
  }

  const allowed = SHARED_PROVIDERS.filter(name => requested.includes(name))
  return {
    unifont: await useUnifont(),
    allowed: allowed.length && allowed.length < SHARED_PROVIDERS.length ? allowed : undefined,
  }
}
