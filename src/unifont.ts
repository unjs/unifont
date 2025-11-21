import type { Storage } from './cache'
import type { InitializedProvider, Provider, ResolveFontOptions, ResolveFontResult } from './types'
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
  resolveFont: (
    fontFamily: string,
    options?: Partial<ResolveFontOptions<{
      [K in T[number] as K['_name']]?: ExtractFamilyOptions<K>;
    }>>,
    providers?: T[number]['_name'][],
  ) => Promise<ResolveFontResult & { provider?: T[number]['_name'] }>
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
}

export async function createUnifont<T extends [Provider, ...Provider[]]>(providers: T, unifontOptions?: UnifontOptions): Promise<Unifont<T>> {
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
    listFonts,
  }
}
