import type { ProviderDefinition, ProviderFactory } from './types'

export function defineFontProvider<T = unknown>(name: string, provider: ProviderDefinition<T>): ProviderFactory<T> {
  return ((options: T) => Object.assign(provider.bind(null, options || {} as T), { _name: name })) as ProviderFactory<T>
}
