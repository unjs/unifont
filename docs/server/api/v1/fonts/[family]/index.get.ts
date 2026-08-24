import type { ProviderName } from '../../../../utils/unifont'
import { createError, defineEventHandler, getQuery, getRouterParam } from 'nitro/h3'
import { lookupFamily } from '../../../../utils/catalogue'
import { metricFallbackCss, toFontFaceCss } from '../../../../utils/css'
import { PROVIDER_META, useProviderScope } from '../../../../utils/unifont'
import { normaliseWeights } from '../../../../utils/weights'

function list(value: unknown, fallback: string[]) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

export default defineEventHandler(async (event) => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw createError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const query = getQuery(event)
  const { unifont, allowed } = await useProviderScope(query.provider)

  const properties = await unifont.getFontProperties(family, allowed)
  if (!properties) {
    throw createError({ statusCode: 404, statusMessage: `No provider knows \`${family}\`.` })
  }

  const askedForWeights = typeof query.weights === 'string' && !!query.weights.trim()
  const { weights, notes } = normaliseWeights(
    list(query.weights, properties.weights?.length ? properties.weights : ['400']),
  )

  const options = {
    weights,
    styles: list(query.styles, properties.styles?.length ? properties.styles : ['normal']) as ('normal' | 'italic' | 'oblique')[],
    subsets: list(query.subsets, properties.subsets?.length ? properties.subsets : ['latin']),
    formats: list(query.formats, ['woff2']) as ('woff2' | 'woff' | 'otf' | 'ttf' | 'eot')[],
  }

  const resolved = await unifont.resolveFont(family, options, allowed)
  const fallbackCss = await metricFallbackCss(family, resolved.fonts, resolved.fallbacks ?? [])
  const entry = await lookupFamily(family)

  return {
    family,
    provider: resolved.provider ?? properties.provider,
    providers: entry?.providers ?? (properties.provider ? [properties.provider] : []),
    origin: resolved.provider ? PROVIDER_META[resolved.provider as ProviderName]?.origin : undefined,
    properties: {
      weights: properties.weights ?? null,
      styles: properties.styles ?? null,
      subsets: properties.subsets ?? null,
      formats: properties.formats ?? null,
    },
    requested: options,
    // Narrowing the defaults, which come from `getFontProperties()`, is not worth a warning.
    notes: askedForWeights ? notes : [],
    fonts: resolved.fonts,
    fallbacks: resolved.fallbacks ?? [],
    css: [
      toFontFaceCss(family, resolved.fonts, { fallbacks: resolved.fallbacks, withMetricFallback: !!fallbackCss }),
      fallbackCss
        ? `\n/*\n * Metric-matched fallback, generated with fontaine. Put it after the family in your\n * stack (\`font-family: "${family}", "${family} fallback", ${resolved.fallbacks?.[0] ?? 'sans-serif'}\`)\n * and the text will not move when the real font arrives.\n */\n${fallbackCss}`
        : '',
    ].filter(Boolean).join('\n'),
  }
})
