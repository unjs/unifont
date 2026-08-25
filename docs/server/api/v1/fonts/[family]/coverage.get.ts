import { HTTPError, defineEventHandler, getQuery, getRouterParam } from 'nitro/h3'
import { coverageForText } from '#server/utils/coverage'
import { useProviderScope } from '#server/utils/unifont'

/** Sample strings covering the gaps people actually hit. */
export const SAMPLES: Record<string, string> = {
  'latin': 'The quick brown fox jumps over the lazy dog',
  'latin-ext': 'Zażółć gęślą jaźń — příšerně žluťoucký kůň',
  'vietnamese': 'Tôi có thể ăn thủy tinh mà không hại gì',
  'greek': 'Ξεσκεπάζω την ψυχοφθόρα βδελυγμία',
  'cyrillic': 'Съешь же ещё этих мягких французских булок',
  'currency': '£ € $ ¥ ₹ ₽ ₩ ₪ ₴ ₦',
  'punctuation': '“curly” ‘quotes’ — em dash … ellipsis † ‡ § ¶',
  'maths': '≈ ≠ ≤ ≥ ± × ÷ ∑ √ ∞',
}

export default defineEventHandler(async (event) => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const query = getQuery(event)
  const { unifont, allowed } = await useProviderScope(query.provider)

  const properties = await unifont.getFontProperties(family, allowed)
  if (!properties) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No provider knows \`${family}\`.` })
  }

  const resolved = await unifont.resolveFont(family, {
    // `unicode-range` does not vary by weight within a family.
    weights: ['400'],
    styles: ['normal'],
    subsets: properties.subsets?.length ? properties.subsets : ['latin'],
    formats: ['woff2'],
  }, allowed)

  const text = typeof query.text === 'string' && query.text ? query.text : undefined

  if (text) {
    event.res.headers.set('cache-control', 'public, max-age=600')
    return { family, provider: resolved.provider, checks: { custom: { text, ...coverageForText(resolved.fonts, text) } } }
  }

  const checks: Record<string, ReturnType<typeof coverageForText> & { text: string }> = {}
  for (const [name, sample] of Object.entries(SAMPLES)) {
    checks[name] = { text: sample, ...coverageForText(resolved.fonts, sample) }
  }

  event.res.headers.set('cache-control', 'public, max-age=600, stale-while-revalidate=3600')
  return { family, provider: resolved.provider, checks }
})
