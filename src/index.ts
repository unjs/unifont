import type { Storage } from './cache'
import type { InitializedProvider, Provider, ProviderContext, ResolveFontOptions, ResolveFontResult } from './types'
import { createCachedAsyncStorage, memoryStorage } from './cache'

export * as providers from './providers'
export type { FontFaceData, FontFaceMeta, FontStyles, LocalFontSource, Provider, ProviderContext, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolveFontOptions } from './types'
export { defineFontProvider } from './utils'

export interface UnifontOptions {
  storage?: Storage
}

export interface Unifont {
  resolveFont: (fontFamily: string, options?: Partial<ResolveFontOptions>, providers?: string[]) => Promise<ResolveFontResult & {
    provider?: string
  }>
  /** @deprecated use `resolveFont` */
  resolveFontFace: (fontFamily: string, options?: Partial<ResolveFontOptions>, providers?: string[]) => Promise<ResolveFontResult & {
    provider?: string
  }>
  listFonts: (providers?: string[]) => Promise<string[] | undefined>
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
}

export async function createUnifont(providers: Provider[], options?: UnifontOptions): Promise<Unifont> {
  const stack: Record<string, InitializedProvider> = {}

  const storageImpl = options?.storage ?? memoryStorage()
  function createProviderAwareStorage(providerName: string, providerOptions: unknown): ProviderContext['storage'] {
    // https://github.com/unjs/unifont/issues/184
    return createCachedAsyncStorage(storageImpl, {
      keyFragments: [providerName, providerOptions],
    })
  }

  // preserve provider order
  for (const provider of providers) {
    // @ts-expect-error we will remove undefined keys later
    stack[provider._name] = undefined
  }

  // initialize all providers in parallel
  await Promise.all(providers.map(async (provider) => {
    const context: ProviderContext = {
      storage: createProviderAwareStorage(provider._name, provider._options),
    }

    try {
      const initializedProvider = await provider(context)
      if (initializedProvider)
        stack[provider._name] = initializedProvider
    }
    catch (err) {
      console.error(`Could not initialize provider \`${provider._name}\`. \`unifont\` will not be able to process fonts provided by this provider.`, err)
    }
    if (!stack[provider._name]?.resolveFont) {
      delete stack[provider._name]
    }
  }))

  const allProviders = Object.keys(stack)

  async function resolveFont(fontFamily: string, options?: Partial<ResolveFontOptions>, providers = allProviders) {
    const mergedOptions = { ...defaultResolveOptions, ...options }
    for (const id of providers) {
      const provider = stack[id]

      try {
        const result = await provider?.resolveFont(fontFamily, mergedOptions)
        if (result) {
          return {
            provider: id,
            ...result,
          }
        }
      }
      catch (err) {
        console.error(`Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`, err)
      }
    }
    return { fonts: [] }
  }

  async function listFonts(providers = allProviders): Promise<string[] | undefined> {
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
      catch (err) {
        console.error(`Could not list names from \`${id}\` provider.`, err)
      }
    }
    return names
  }

  return {
    resolveFont,
    // TODO: remove before v1
    resolveFontFace: resolveFont,
    listFonts,
  }
}
