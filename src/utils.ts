import type { ProviderDefinition, ProviderFactory } from './types'

export function defineFontProvider<T = unknown>(name: string, provider: ProviderDefinition<T>): ProviderFactory<T> {
  return ((options: T) => Object.assign(provider.bind(null, options || {} as T), { _name: name })) as ProviderFactory<T>
}

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
