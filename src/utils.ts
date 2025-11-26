import type { ProviderDefinition, ProviderFactory } from './types'
import { findAll, generate, parse } from 'css-tree'

export function defineFontProvider<TName extends string, TOptions extends Record<string, any> = never>(name: TName, provider: ProviderDefinition<TOptions>): ProviderFactory<TName, TOptions> {
  return ((options: TOptions) => Object.assign(provider.bind(null, options || {} as TOptions), { _name: name, _options: options })) as ProviderFactory<TName, TOptions>
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

export function splitCssIntoSubsets(input: string): { subset: string | null, css: string }[] {
  const data: { subset: string | null, css: string }[] = []

  const comments: { value: string, endLine: number }[] = []
  const nodes = findAll(
    parse(input, {
      positions: true,
      // Comments are not part of the tree. We rely on the positions to infer the subset
      onComment(value, loc) {
        comments.push({ value: value.trim(), endLine: loc.end.line })
      },
    }),
    node => node.type === 'Atrule' && node.name === 'font-face',
  )

  // If there are no comments, we don't associate subsets because we can't
  if (comments.length === 0) {
    return [{ subset: null, css: input }]
  }

  for (const node of nodes) {
    const comment = comments.filter(comment => comment.endLine < node.loc!.start.line).at(-1)
    if (!comment)
      continue

    data.push({ subset: comment.value, css: generate(node) })
  }

  return data
}
