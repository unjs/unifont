import type { ProviderDefinition, ProviderFactory } from './types'

interface DefineFontProvider {
  <TName extends string, TOptions extends Record<string, any> = never>(name: TName,
    provider: ProviderDefinition<TOptions>,): ProviderFactory<TName, TOptions, never>

  <TFamilyOptions extends Record<string, any> = never>(): <TName extends string, TOptions extends Record<string, any> = never>(name: TName, provider: ProviderDefinition<TOptions, TFamilyOptions>) => ProviderFactory<TName, TOptions, TFamilyOptions>
}

function defineFontProviderImpl<
  TName extends string,
  TOptions extends Record<string, any>,
  TFamilyOptions extends Record<string, any>,
>(name: TName, provider: ProviderDefinition<TOptions, TFamilyOptions>) {
  return ((options: TOptions) =>
    Object.assign(provider.bind(null, options || ({} as TOptions)), {
      _name: name,
      _options: options,
    })) as ProviderFactory<TName, TOptions, TFamilyOptions>
}

export const defineFontProvider = ((name, provider) =>
  name
    ? defineFontProviderImpl(name, provider)
    : defineFontProviderImpl) as DefineFontProvider

export function prepareWeights({
  inputWeights,
  weights,
  hasVariableWeights,
}: {
  inputWeights: string[]
  weights: string[]
  hasVariableWeights: boolean
}): { weight: string, variable: boolean }[] {
  const collectedWeights: string[] = []

  for (const weight of inputWeights) {
    // The request weight is a range
    if (weight.includes(' ')) {
      if (hasVariableWeights) {
        collectedWeights.push(weight)
        continue
      }
      // As a fallback, request all weights in between
      const [min, max] = weight.split(' ')
      collectedWeights.push(
        ...weights
          .filter((_w) => {
            const w = Number(_w)
            return w >= Number(min) && w <= Number(max)
          })
          .map(w => String(w)),
      )
      continue
    }
    // The requested weight is a standard weight
    if (weights.includes(weight)) {
      collectedWeights.push(weight)
    }
  }

  return [...new Set(collectedWeights)].map(weight => ({
    weight,
    variable: weight.includes(' '),
  }))
}
