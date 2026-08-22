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
      // A static family needs one file per weight, so we resolve a range to a handful of
      // representative weights rather than every weight the family happens to publish.
      const [min, max] = weight.split(' ')
      const available = weights
        .map(Number)
        .filter(w => !Number.isNaN(w))
        .sort((a, b) => a - b)
      const inRange = available.filter(w => w >= Number(min) && w <= Number(max))

      if (inRange.length > 0) {
        // Keeping the weight nearest to `normal` as well as the endpoints means text at the
        // default weight is never matched against a far-away weight by the browser's
        // font matching algorithm (which would render, say, 400 as 100).
        for (const w of [inRange[0]!, closestTo(inRange, 400), inRange.at(-1)!]) {
          collectedWeights.push(String(w))
        }
      }
      else if (available.length > 0) {
        collectedWeights.push(String(closestTo(available, clamp(400, Number(min), Number(max)))))
      }
      continue
    }
    // The requested weight is a standard weight
    if (weights.includes(weight)) {
      collectedWeights.push(weight)
    }
  }

  return Array.from(new Set(collectedWeights), weight => ({
    weight,
    variable: weight.includes(' '),
  }))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Picks the value nearest to `target`, preferring the lower value when two are equidistant. */
function closestTo(sortedValues: number[], target: number): number {
  let closest = sortedValues[0]!
  for (const value of sortedValues) {
    if (Math.abs(value - target) < Math.abs(closest - target)) {
      closest = value
    }
  }
  return closest
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

/** Maps variation format strings (e.g. 'woff2-variations') to their base CSS format name (e.g. 'woff2') */
const variationFormatMap: Record<string, string> = {
  'woff2-variations': 'woff2',
  'woff-variations': 'woff',
  'opentype-variations': 'opentype',
  'truetype-variations': 'truetype',
}

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
      .filter((source) => {
        if ('name' in source)
          return true
        if (!source.format)
          return true
        if (formats.includes(source.format))
          return true
        const baseFormat = variationFormatMap[source.format]
        return !!baseFormat && formats.includes(baseFormat)
      })

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
