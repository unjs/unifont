import type { InitializedProvider, Provider, ResolveFontFacesOptions } from './types'
import { createAsyncStorage, memoryStorage, type Storage } from './cache'

export * as providers from './providers'
export { defineFontProvider } from './types'

export interface UnifontOptions {
  storage?: Storage
}

export const defaultResolveOptions: ResolveFontFacesOptions = {
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

export async function createUnifont(providers: Provider[], options?: UnifontOptions) {
  const stack: Record<string, InitializedProvider> = {}
  const unifontContext = {
    storage: createAsyncStorage(options?.storage ?? memoryStorage()),
  }

  for (const provider of providers) {
    try {
      const initializedProvider = await provider(unifontContext)
      if (initializedProvider) {
        stack[provider._name] = initializedProvider
      }
    }
    catch (err) {
      console.error(`Could not initialize provider \`${provider._name}\`. \`unifont\` will not be able to process fonts provided by this provider.`, err)
    }
  }

  const allProviders = Object.keys(stack)

  async function resolveFontFace(fontFamily: string, options = defaultResolveOptions, providers = allProviders) {
    for (const id of providers) {
      const provider = stack[id]
      if (provider?.resolveFontFaces) {
        try {
          const result = await provider.resolveFontFaces(fontFamily, options)
          if (result) {
            return result
          }
        }
        catch (err) {
          console.error(`Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`, err)
        }
      }
    }
    return { fonts: [] }
  }

  return {
    resolveFontFace,
  }
}
