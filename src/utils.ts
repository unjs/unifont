import type { FontFaceData, FontFormat, LocalFontSource, ProviderDefinition, ProviderFactory, RemoteFontSource } from './types'
import { findAll, generate, parse } from 'css-tree'
import { hash } from 'ohash'

export function defineFontProvider<
  Name extends string,
  Provider extends ProviderDefinition<never, never>,
>(
  name: Name,
  provider: Provider,
): Provider extends ProviderDefinition<infer Options, infer FamilyOptions> ? ProviderFactory<
  Name,
  Options,
  FamilyOptions
> : never {
  return ((options: Parameters<Provider>[0]) =>
    Object.assign(provider.bind(null, options || ({} as Parameters<Provider>[0])), {
      _name: name,
      _options: options,
    })) as any
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

    data.push({ subset: comment?.value ?? null, css: generate(node) })
  }

  return data
}

// https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/src#font_formats
export const formatMap = {
  woff2: 'woff2',
  woff: 'woff',
  otf: 'opentype',
  ttf: 'truetype',
  eot: 'embedded-opentype',
} satisfies Record<string, string>

function computeIdFromSource(source: LocalFontSource | RemoteFontSource): string {
  return 'name' in source ? source.name : source.url
}

export function cleanFontFaces(fonts: FontFaceData[], _formats: FontFormat[]): FontFaceData[] {
  const formats = _formats.map(format => formatMap[format])
  const result: FontFaceData[] = []
  const hashToIndex = new Map<string, number>()

  for (const { src: _src, meta, ...font } of fonts) {
    const key = hash(font)
    const index = hashToIndex.get(key)
    const src = _src.map(source => 'name' in source
      ? source
      : ({ ...source, ...(source.format
          ? {
              // The format may be already correct
              format: formatMap[source.format as FontFormat] ?? source.format,
            }
          : {}) }))
      .filter(source => 'name' in source || !source.format || formats.includes(source.format as FontFormat))

    if (src.length === 0) {
      continue
    }

    if (index === undefined) {
      hashToIndex.set(key, result.push({
        ...font,
        ...(meta ? { meta } : {}),
        src,
      }) - 1)
      continue
    }

    const existing = result[index]!

    const ids = new Set(existing.src.map(source => computeIdFromSource(source)))

    existing.src.push(
      ...src.filter((source) => {
        const id = computeIdFromSource(source)
        return !ids.has(id) && ids.add(id)
      }),
    )
  }

  return result
}
