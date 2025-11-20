import type { Storage } from './cache'
import type { InitializedProvider, Provider, ResolveFontOptions, ResolveFontResult } from './types'
import { createAsyncStorage, memoryStorage } from './cache'

export * as providers from './providers'
export type { FontFaceData, FontFaceMeta, FontStyles, LocalFontSource, Provider, ProviderContext, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolveFontOptions } from './types'
export { defineFontProvider } from './utils'

export interface UnifontOptions {
  storage?: Storage
  throwOnError?: boolean
}

export interface Unifont<T extends string> {
  resolveFont: (fontFamily: string, options?: Partial<ResolveFontOptions>, providers?: T[]) => Promise<ResolveFontResult & {
    provider?: T
  }>
  listFonts: (providers?: T[]) => Promise<string[] | undefined>
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

export async function createUnifont<T extends [Provider, ...Provider[]]>(providers: T, unifontOptions?: UnifontOptions): Promise<Unifont<T[number]['_name']>> {
  const stack: Record<string, InitializedProvider> = {}
  const unifontContext = {
    storage: createAsyncStorage(unifontOptions?.storage ?? memoryStorage()),
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

  return {
    async resolveFont(fontFamily, options, providers = allProviders) {
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
        catch (cause) {
          const message = `Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`
          if (unifontOptions?.throwOnError) {
            throw new Error(message, { cause })
          }
          console.error(message, cause)
        }
      }
      return { fonts: [] }
    },
    async listFonts(providers = allProviders): Promise<string[] | undefined> {
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
    },
  }
}
