import type { FontFaceData, FontFormat, FontStyles, LocalFontSource, NormalizedVariableAxis, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolvedVariableAxis, ResolveFontOptions, ResolveFontResult, VariableAxis, VariableAxisBound } from './types'
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

const KNOWN_STYLES = ['normal', 'italic', 'oblique'] as const

/** Narrows provider metadata styles to the styles unifont understands. */
export function filterKnownStyles(styles: string[]): FontStyles[] {
  return styles.filter((s): s is FontStyles => (KNOWN_STYLES as readonly string[]).includes(s))
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

// Resolved from the `weights` and `styles` options, which select between font faces.
const AXES_RESOLVED_AS_FONT_FACES = new Set(['wght', 'ital'])

function normalizeBound(value: VariableAxisBound): string | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? String(parsed) : undefined
}

/**
 * Normalises a `variableAxis` request to one shape: a single value as a string, an inclusive range
 * as a `[min, max]` pair. Values that are not finite numbers are dropped.
 */
export function normalizeVariableAxis(variableAxis: ResolveFontOptions['variableAxis']): NormalizedVariableAxis | undefined {
  if (!variableAxis)
    return undefined

  const normalized: NormalizedVariableAxis = {}

  for (const [tag, values] of Object.entries(variableAxis)) {
    const normalizedValues: (string | [string, string])[] = []
    for (const value of values ?? []) {
      if (typeof value === 'number' || typeof value === 'string') {
        const normalizedValue = normalizeBound(value)
        if (normalizedValue !== undefined)
          normalizedValues.push(normalizedValue)
        continue
      }
      const [min, max] = Array.isArray(value) ? value : [value.min, value.max]
      const normalizedMin = normalizeBound(min)
      const normalizedMax = normalizeBound(max)
      if (normalizedMin === undefined || normalizedMax === undefined)
        continue
      normalizedValues.push(normalizedMin === normalizedMax ? normalizedMin : [normalizedMin, normalizedMax])
    }
    if (normalizedValues.length > 0)
      normalized[tag] = normalizedValues
  }

  return normalized
}

/**
 * Expresses single requested axis values as `font-variation-settings` (`"<tag>" <value>`, comma
 * separated) and reports what became of every requested axis. A provider that lists the axes its
 * font file carries in `applied` is taken at its word, and no descriptor is written.
 */
export function applyVariableAxis(fonts: FontFaceData[], variableAxis: NormalizedVariableAxis | undefined, applied?: VariableAxis[]): { fonts: FontFaceData[], variableAxis: ResolveFontResult['variableAxis'] } {
  if (!variableAxis)
    return { fonts, variableAxis: undefined }

  const settings: string[] = []
  const resolved: Partial<Record<string, ResolvedVariableAxis>> = {}
  const appliedTags = new Set(applied)

  for (const [tag, values] of Object.entries(variableAxis)) {
    if (appliedTags.has(tag)) {
      resolved[tag] = { values: values!, appliedAs: 'font-file' }
      continue
    }
    if (applied) {
      resolved[tag] = { values: values!, appliedAs: 'none' }
      continue
    }
    const value = values?.length === 1 ? values[0] : undefined
    if (typeof value !== 'string' || AXES_RESOLVED_AS_FONT_FACES.has(tag)) {
      resolved[tag] = { values: values!, appliedAs: 'none' }
      continue
    }
    resolved[tag] = { values: values!, appliedAs: 'variation-settings' }
    settings.push(`"${tag}" ${value}`)
  }

  if (settings.length === 0)
    return { fonts, variableAxis: resolved }

  const variationSettings = settings.join(', ')
  return {
    fonts: fonts.map(font => font.variationSettings ? font : { ...font, variationSettings }),
    variableAxis: resolved,
  }
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
