import type { Storage } from './cache'
import type { InitializedProvider, Provider, ProviderContext, ResolveFontOptions, ResolveFontResult } from './types'
import { createAsyncStorage, memoryStorage } from './cache'

export interface UnifontOptions {
  storage?: Storage
  throwOnError?: boolean
}

type ExtractFamilyOptions<T extends Provider> = Exclude<
  Parameters<NonNullable<Awaited<ReturnType<T>>>['resolveFont']>[1]['options'],
  undefined
>

export interface Unifont<T extends Provider[]> {
  providers: T[number]['_name'][]
  // TODO: provider generic
  resolveFont: (options: Partial<{
    [K in T[number] as K['_name']]?: ExtractFamilyOptions<K>;
  }> & {
    fontFamily: string
    provider: T[number]['_name']
  }) => Promise<ResolveFontResult>
  listFonts: (options: { provider: T[number]['_name'] }) => Promise<string[] | undefined>
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
  const stack: Record<string, InitializedProvider> = {}

  const storage = unifontOptions?.storage ?? memoryStorage()

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
    { fontFamily, provider: id, ...options }: Partial<ResolveFontOptions> & {
      fontFamily: string
      provider: T[number]['_name']
    },
  ): Promise<ResolveFontResult> {
    const provider = stack[id]
    if (!provider) {
      const message = `Could not found \`${id}\` provider.`
      if (unifontOptions?.throwOnError) {
        throw new Error(message)
      }
      console.error(message)
      return { fonts: [] }
    }
    try {
      const result = await provider?.resolveFont(fontFamily, { ...defaultResolveOptions, ...options })
      if (result) {
        return result
      }
    }
    catch (cause) {
      const message = `Could not resolve font face for \`${fontFamily}\` from \`${id}\` provider.`
      if (unifontOptions?.throwOnError) {
        throw new Error(message, { cause })
      }
      console.error(message, cause)
    }
    return { fonts: [] }
  }

  async function listFonts({ provider: id }: { provider: T[number]['_name'] }): Promise<string[] | undefined> {
    const provider = stack[id]

    try {
      return await provider?.listFonts?.()
    }
    catch (cause) {
      const message = `Could not list names from \`${id}\` provider.`
      if (unifontOptions?.throwOnError) {
        throw new Error(message, { cause })
      }
      console.error(message, cause)
    }
  }

  return {
    providers: allProviders,
    resolveFont,
    listFonts,
  }
}
