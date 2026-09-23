import type { Storage } from './cache'
import type { FontProperties, InitializedProvider, Provider, ProviderContext, ProviderResolveFontOptions, ResolveFontOptions, ResolveFontResult } from './types'
import { createAPIFetch } from './api-base'
import { createAsyncStorage, memoryStorage } from './cache'
import { installProxyDispatcher } from './env-proxy'
import { applyVariableAxis, normalizeVariableAxis } from './utils'

export interface UnifontOptions {
  storage?: Storage
  throwOnError?: boolean
  /**
   * Base URL of a `unifont` proxy to route provider API requests through, for environments
   * (browsers, web containers) that cannot call the provider APIs directly. Providers whose APIs
   * are already reachable cross-origin, such as `npm`, are unaffected.
   *
   * Defaults to `https://proxy.unifont.dev` in a browser or a StackBlitz web container, where the
   * provider APIs are unreachable anyway, and to no proxy elsewhere. Pass `false` to always
   * request the provider APIs directly.
   *
   * **Experimental.** `https://proxy.unifont.dev` is best-effort, rate-limited at our discretion,
   * and may change or disappear without notice. Deploy your own if you need one in production.
   * @example 'https://proxy.unifont.dev'
   */
  apiBase?: string | false
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

export const defaultResolveOptions: ProviderResolveFontOptions = {
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

  const storage = unifontOptions?.storage ?? memoryStorage()
  const fetch = createAPIFetch(unifontOptions?.apiBase)

  const factories: Record<string, Provider> = {}
  // preserve provider order
  for (const provider of providers) {
    factories[provider._name] = provider
  }

  const allProviders = Object.keys(factories)

  const stack: Record<string, Promise<InitializedProvider | Error | undefined>> = {}

  async function* initializeProviders<Id extends string>(ids: Id[], errors: Error[]) {
    for (const id of ids) {
      const factory = factories[id]
      if (!factory) {
        continue
      }
      stack[id] ??= (async () => {
        const context: ProviderContext = {
          storage: createAsyncStorage(storage, {
            cachedBy: [factory._name, factory._options],
          }),
          fetch,
        }
        try {
          const provider = await factory(context)
          return provider?.resolveFont ? provider : undefined
        }
        catch (cause) {
          return new Error(`Could not initialize provider \`${id}\`. \`unifont\` will not be able to process fonts provided by this provider.`, { cause })
        }
      })()
      const provider = await stack[id]
      if (provider instanceof Error) {
        errors.push(provider)
      }
      else if (provider) {
        yield [id, provider] as const
      }
    }
  }

  function reportErrors(errors: Error[], message: string, resolved: boolean) {
    if (errors.length === 0) {
      return
    }
    if (unifontOptions?.throwOnError && !resolved) {
      throw errors.length === 1 ? errors[0]! : new AggregateError(errors, message)
    }
    const log = resolved ? console.warn : console.error
    for (const error of errors) {
      log(error.message, error.cause)
    }
  }

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
    const { variableAxis: requestedVariableAxis, ...resolveOptions } = options
    const variableAxis = normalizeVariableAxis(requestedVariableAxis)
    const mergedOptions = { ...defaultResolveOptions, ...resolveOptions, ...(variableAxis ? { variableAxis } : {}) }
    const errors: Error[] = []
    for await (const [id, provider] of initializeProviders(providers, errors)) {
      try {
        const result = await provider.resolveFont(fontFamily, {
          ...mergedOptions,
          options: mergedOptions.options?.[id] as any,
        })
        if (result) {
          const { appliedVariableAxis, ...providerResult } = result
          const { fonts, variableAxis: resolvedVariableAxis } = applyVariableAxis(result.fonts, variableAxis, appliedVariableAxis)
          reportErrors(errors, `Could not resolve font face for \`${fontFamily}\`.`, true)
          return {
            provider: id,
            ...providerResult,
            ...(resolvedVariableAxis ? { variableAxis: resolvedVariableAxis } : {}),
            fonts,
          }
        }
      }
      catch (cause) {
        errors.push(new Error(`Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`, { cause }))
      }
    }
    reportErrors(errors, `Could not resolve font face for \`${fontFamily}\`.`, false)
    return { fonts: [] }
  }

  async function getFontProperties(
    fontFamily: string,
    providers: T[number]['_name'][] = allProviders,
  ): Promise<
    (FontProperties & { provider?: T[number]['_name'] }) | undefined
  > {
    const errors: Error[] = []
    for await (const [id, provider] of initializeProviders(providers, errors)) {
      try {
        const result = await provider.getFontProperties?.(fontFamily)
        if (result) {
          reportErrors(errors, `Could not get font properties for \`${fontFamily}\`.`, true)
          return {
            ...result,
            provider: id,
          }
        }
      }
      catch (cause) {
        errors.push(new Error(`Could not get font properties for \`${fontFamily}\` from \`${id}\` provider.`, { cause }))
      }
    }
    reportErrors(errors, `Could not get font properties for \`${fontFamily}\`.`, false)
    return undefined
  }

  async function listFonts(providers: T[number]['_name'][] = allProviders): Promise<string[] | undefined> {
    let names: string[] | undefined
    const errors: Error[] = []
    for await (const [id, provider] of initializeProviders(providers, errors)) {
      try {
        const result = await provider.listFonts?.()
        if (result) {
          names ??= []
          names.push(...result)
        }
      }
      catch (cause) {
        errors.push(new Error(`Could not list names from \`${id}\` provider.`, { cause }))
      }
    }
    reportErrors(errors, `Could not list names.`, false)
    return names
  }

  return {
    resolveFont,
    getFontProperties,
    listFonts,
  }
}
