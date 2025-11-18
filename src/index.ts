import type { Storage } from './cache'
import type { InitializedProvider, Provider, ResolveFontOptions, ResolveFontResult } from './types'
import { createAsyncStorage, memoryStorage } from './cache'

export * as providers from './providers'
export type { FontFaceData, FontFaceMeta, FontStyles, LocalFontSource, Provider, ProviderContext, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolveFontOptions } from './types'
export { defineFontProvider } from './utils'

export interface UnifontOptions {
  storage?: Storage
}

export interface Unifont<T> {
  providers: T[]
  resolveFont: (options: Partial<ResolveFontOptions> & {
    fontFamily: string
    provider: T
  }) => Promise<ResolveFontResult>
  listFonts: (options: { provider: T }) => Promise<string[] | undefined>
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

export async function createUnifont<T extends [Provider, ...Provider[]]>(providers: T, options?: UnifontOptions): Promise<Unifont<T[number]['_name']>> {
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

  return {
    providers: allProviders,
    async resolveFont({
      fontFamily,
      provider: id,
      ...options
    }) {
      const provider = stack[id]
      if (!provider) {
        console.error(`Could not found \`${id}\` provider.`)
        return { fonts: [] }
      }

      try {
        const result = await provider.resolveFont(fontFamily, { ...defaultResolveOptions, ...options })
        if (result) {
          return result
        }
      }
      catch (err) {
        console.error(`Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`, err)
      }

      return { fonts: [] }
    },
    async listFonts({ provider: id }) {
      const provider = stack[id]
      try {
        return await provider?.listFonts?.()
      }
      catch (err) {
        console.error(`Could not list names from \`${id}\` provider.`, err)
      }
    },
  }
}
