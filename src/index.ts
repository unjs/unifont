import type { FontFaceData, InitializedProvider, Provider, ResolveFontOptions } from './types'
import { createAsyncStorage, memoryStorage, type Storage } from './cache'

export * as providers from './providers'
export { defineFontProvider } from './types'

export interface UnifontOptions {
  storage?: Storage
}

export type { ResolveFontOptions } from './types'
export interface Unifont {
  resolveFont: (fontFamily: string, options?: ResolveFontOptions, providers?: string[]) => Promise<{ fonts: FontFaceData[] }>
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
    if (!stack[provider._name]) {
      delete stack[provider._name]
    }
  }))

  const allProviders = Object.keys(stack)

  async function resolveFont(fontFamily: string, options = defaultResolveOptions, providers = allProviders) {
    for (const id of providers) {
      const provider = stack[id]
      if (!provider?.resolveFont)
        continue

      try {
        const result = await provider.resolveFont(fontFamily, options)
        if (result)
          return result
      }
      catch (err) {
        console.error(`Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`, err)
      }
    }
    return { fonts: [] }
  }

  return {
    resolveFont,
  }
}
