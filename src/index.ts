import type { InitializedProvider, Provider, ResolveFontOptions, ResolveFontResult } from './types'
import { createAsyncStorage, memoryStorage, type Storage } from './cache'

export * as providers from './providers'
export type { FontFaceData, FontStyles, LocalFontSource, Provider, ProviderContext, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolveFontOptions } from './types'
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
  const unifontContext = {
    storage: createAsyncStorage(options?.storage ?? memoryStorage()),
  }

  // preserve provider order
  for (const provider of providers) {
    // @ts-expect-error we will remove undefined keys later
    stack[provider._name] = undefined
  }

  // initialize all providers in parallel
  await Promise.all(providers.map(async (provider) => {
    try {
      const initializedProvider = await provider(unifontContext)
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

  return {
    resolveFont,
    // TODO: remove before v1
    resolveFontFace: resolveFont,
  }
}
