import type { FontFaceData, LocalFontSource, RemoteFontSource } from 'unifont'
import { generateFontFace, readMetrics } from 'fontaine'
import { useStorage } from 'nitro/storage'

/** Generic families fontaine can build a metric-matched fallback against. */
const CATEGORY_FALLBACKS = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']

function isLocal(source: LocalFontSource | RemoteFontSource): source is LocalFontSource {
  return 'name' in source
}

/**
 * Fontshare returns protocol-relative URLs, which break as soon as the CSS is copied into a file
 * opened from disk, or fetched by a client with no notion of a current protocol.
 */
export function absoluteUrl(url: string) {
  return url.startsWith('//') ? `https:${url}` : url
}

function serialiseSource(source: LocalFontSource | RemoteFontSource) {
  if (isLocal(source)) {
    return `local("${source.name}")`
  }
  const parts = [`url("${absoluteUrl(source.url)}")`]
  if (source.format) {
    parts.push(`format("${source.format}")`)
  }
  if (source.tech) {
    parts.push(`tech(${source.tech})`)
  }
  return parts.join(' ')
}

function weightValue(weight: FontFaceData['weight']) {
  return Array.isArray(weight) ? weight.join(' ') : String(weight)
}

/** Serialise resolved faces to `@font-face` rules, plain enough to read and paste. */
export function toFontFaceCss(
  family: string,
  faces: FontFaceData[],
  options: { fallbacks?: string[], withMetricFallback?: boolean } = {},
) {
  const blocks = faces.map((face) => {
    const lines = [`  font-family: "${family}";`]
    if (face.src.length) {
      lines.push(`  src: ${face.src.map(serialiseSource).join(',\n       ')};`)
    }
    lines.push(`  font-display: ${face.display ?? 'swap'};`)
    if (face.weight !== undefined) {
      lines.push(`  font-weight: ${weightValue(face.weight)};`)
    }
    if (face.style) {
      lines.push(`  font-style: ${face.style};`)
    }
    if (face.stretch) {
      lines.push(`  font-stretch: ${face.stretch};`)
    }
    if (face.featureSettings) {
      lines.push(`  font-feature-settings: ${face.featureSettings};`)
    }
    if (face.variationSettings) {
      lines.push(`  font-variation-settings: ${face.variationSettings};`)
    }
    if (face.unicodeRange?.length) {
      lines.push(`  unicode-range: ${face.unicodeRange.join(', ')};`)
    }
    const subset = face.meta?.subset
    const header = subset ? `/* ${subset} */\n@font-face {` : '@font-face {'
    return `${header}\n${lines.join('\n')}\n}`
  })

  if (options.fallbacks?.length) {
    // The metric-matched face sits between the real family and the generic.
    const names = options.withMetricFallback
      ? [family, fallbackFamily(family), ...options.fallbacks]
      : [family, ...options.fallbacks]
    const stack = names.map(name => (/\s/.test(name) ? `"${name}"` : name)).join(', ')
    blocks.push(`:root {\n  --font-${family.toLowerCase().replace(/\W+/g, '-')}: ${stack};\n}`)
  }

  return blocks.join('\n\n')
}

/** Total transferred bytes for a set of faces, when the provider reports content lengths. */
export function faceUrls(faces: FontFaceData[]) {
  return faces.flatMap(face =>
    face.src
      .filter((source): source is RemoteFontSource => !isLocal(source))
      .map(source => absoluteUrl(source.url)),
  )
}

/** Metric-adjusted fallback faces, so a specimen does not reflow when the real font arrives. */
export async function metricFallbackCss(family: string, faces: FontFaceData[], fallbacks: string[]) {
  const generics = fallbacks.filter(name => CATEGORY_FALLBACKS.includes(name))
  if (!generics.length) {
    return ''
  }

  const url = faceUrls(faces)[0]
  const metrics = url ? await metricsForUrl(url) : null
  if (!metrics) {
    return ''
  }

  return generics
    .map(generic => generateFontFace(metrics!, {
      name: fallbackFamily(family),
      font: generic,
      metrics: undefined,
    }))
    .join('\n')
}

/**
 * Metrics for the exact file being served, cached by URL. `fontaine`'s `getMetricsForFamily` reads
 * a 2.9 MB bundled dataset instead, and describes the name rather than the served bytes.
 */
async function metricsForUrl(url: string) {
  const cache = useStorage('unifont')
  const key = `metrics:${url}`
  const cached = await cache.getItem<Awaited<ReturnType<typeof readMetrics>>>(key).catch(() => null)
  if (cached) {
    return cached
  }

  const metrics = await readMetrics(url).catch(() => null)
  if (metrics) {
    await cache.setItem(key, metrics).catch(() => {})
  }
  return metrics
}

/** The name a consumer puts after the real family in its stack. */
export function fallbackFamily(family: string) {
  return `${family} fallback`
}
