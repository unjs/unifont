import type { Storage } from './cache'
import type { FontProperties, InitializedProvider, Provider, ProviderContext, ResolveFontOptions, ResolveFontResult } from './types'
import { createAPIFetch } from './api-base'
import { createAsyncStorage, memoryStorage } from './cache'
import { installProxyDispatcher } from './env-proxy'

export interface UnifontOptions {
  storage?: Storage
  throwOnError?: boolean
  /**
   * Base URL of a `unifont` proxy to route provider API requests through, for environments
   * (browsers, web containers) that cannot call the provider APIs directly. Providers whose APIs
   * are already reachable cross-origin, such as `npm`, are unaffected.
   *
   * **Experimental.** `https://proxy.unifont.dev` is provided for reproductions and playgrounds
   * only: it is best-effort, rate-limited at our discretion, and may change or disappear without
   * notice. Deploy your own if you need one in production.
   * @example 'https://proxy.unifont.dev'
   */
  apiBase?: string
}

type ExtractFamilyOptions<T extends Provider> = Exclude<
  Parameters<NonNullable<Awaited<ReturnType<T>>>['resolveFont']>[1]['options'],
  undefined
>

export interface Unifont<T extends Provider[]> {
  resolveFont: (
    fontFamily: string,
    options?: Partial<ResolveFontOptions<{
      [K in T[number] as K['_name']]?: ExtractFamilyOptions<K>;
    }>>,
    providers?: T[number]['_name'][],
  ) => Promise<ResolveFontResult & { provider?: T[number]['_name'] }>
  getFontProperties: (fontFamily: string, providers?: T[number]['_name'][]) => Promise<(FontProperties & { provider?: T[number]['_name'] }) | undefined>
  listFonts: (providers?: T[number]['_name'][]) => Promise<string[] | undefined>
}

export const defaultResolveOptions: ResolveFontOptions = {
  weights: ['400'],
  styles: ['normal', 'italic'] as const,
  subsets: [
    'cyrillic-ext',
    'cyrillic',
    'greek-ext',
    'greek',
    'vietnamese',
    'latin-ext',
    'latin',
  ],
  formats: ['woff2'],
}

export async function createUnifont<T extends [Provider, ...Provider[]]>(providers: T, unifontOptions?: UnifontOptions): Promise<Unifont<T>> {
  await installProxyDispatcher()

  const stack: Record<string, InitializedProvider> = {}

  const storage = unifontOptions?.storage ?? memoryStorage()
  const fetch = createAPIFetch(unifontOptions?.apiBase)

  // preserve provider order
  for (const provider of providers) {
    // @ts-expect-error we will remove undefined keys later
    stack[provider._name] = undefined
  }

  // initialize all providers in parallel
  await Promise.all(providers.map(async (provider) => {
    const context: ProviderContext = {
      storage: createAsyncStorage(storage, {
        cachedBy: [provider._name, provider._options],
      }),
      fetch,
    }
    try {
      const initializedProvider = await provider(context)
      if (initializedProvider)
        stack[provider._name] = initializedProvider
    }
    catch (cause) {
      const message = `Could not initialize provider \`${provider._name}\`. \`unifont\` will not be able to process fonts provided by this provider.`
      if (unifontOptions?.throwOnError) {
        throw new Error(message, { cause })
      }
      console.error(message, cause)
    }
    if (!stack[provider._name]?.resolveFont) {
      delete stack[provider._name]
    }
  }))

  const allProviders = Object.keys(stack)

  async function resolveFont(
    fontFamily: string,
    options: Partial<ResolveFontOptions<{
      [K in T[number] as K['_name']]?: ExtractFamilyOptions<K>;
    }>> = {},
    providers: T[number]['_name'][] = allProviders,
  ): Promise<
    ResolveFontResult & {
      provider?: T[number]['_name']
    }
  > {
    const mergedOptions = { ...defaultResolveOptions, ...options }
    for (const id of providers) {
      const provider = stack[id]

      try {
        const result = await provider?.resolveFont(fontFamily, {
          ...mergedOptions,
          options: mergedOptions.options?.[id] as any,
        })
        if (result) {
          return {
            provider: id,
            ...result,
          }
        }
      }
      catch (cause) {
        const message = `Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`
        if (unifontOptions?.throwOnError) {
          throw new Error(message, { cause })
        }
        console.error(message, cause)
      }
    }
    return { fonts: [] }
  }

  async function getFontProperties(
    fontFamily: string,
    providers: T[number]['_name'][] = allProviders,
  ): Promise<
    (FontProperties & { provider?: T[number]['_name'] }) | undefined
  > {
    for (const id of providers) {
      const provider = stack[id]

      try {
        const result = await provider?.getFontProperties?.(fontFamily)
        if (result) {
          return {
            ...result,
            provider: id,
          }
        }
      }
      catch (cause) {
        const message = `Could not get font properties for \`${fontFamily}\` from \`${id}\` provider.`
        if (unifontOptions?.throwOnError) {
          throw new Error(message, { cause })
        }
        console.error(message, cause)
      }
    }
    return undefined
  }

  async function listFonts(providers: T[number]['_name'][] = allProviders): Promise<string[] | undefined> {
    let names: string[] | undefined
    for (const id of providers) {
      const provider = stack[id]

      try {
        const result = await provider?.listFonts?.()
        if (result) {
          names ??= []
          names.push(...result)
        }
      }
      catch (cause) {
        const message = `Could not list names from \`${id}\` provider.`
        if (unifontOptions?.throwOnError) {
          throw new Error(message, { cause })
        }
        console.error(message, cause)
      }
    }
    return names
  }

  return {
    resolveFont,
    getFontProperties,
    listFonts,
  }
}
