import type { ProviderName } from './unifont'
import { searchCatalogue } from './catalogue'
import { coverageForText } from './coverage'
import { faceUrls, metricFallbackCss, toFontFaceCss } from './css'
import { PROVIDER_META, PROVIDER_NAMES, QUERYABLE_PROVIDERS, useProvider, useUnifont } from './unifont'
import { normaliseWeights } from './weights'

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (args: Record<string, unknown>) => Promise<string>
}

function list(value: unknown, fallback: string[]) {
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(part => part.trim()).filter(Boolean)
  }
  return Array.isArray(value) && value.length ? value.map(String) : fallback
}

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})

const string = (description: string) => ({ type: 'string', description })
const integer = (description: string) => ({ type: 'integer', description })

/** The tools an agent gets. Each returns text, or CSS where the answer is CSS. */
export const MCP_TOOLS: McpTool[] = [
  {
    name: 'search_fonts',
    description: 'Search font families across every provider that will list them (Google Fonts, Bunny, Fontshare, Fontsource, Google Icons). Returns family names, and which providers host each one.',
    inputSchema: object({
      query: string('A family name, or part of one. Leave it out to list everything.'),
      provider: { ...string('Limit to one provider.'), enum: [...PROVIDER_NAMES] },
      limit: integer('How many results, default 20, capped at 100.'),
    }),
    async run(args) {
      const result = await searchCatalogue({
        query: typeof args.query === 'string' ? args.query : '',
        provider: args.provider as ProviderName | undefined,
        limit: Math.min(Number(args.limit) || 20, 100),
      })
      if (!result.families.length) {
        return `No family matches ${JSON.stringify(args.query ?? '')}.`
      }
      const lines = result.families.map(entry => `${entry.family}: ${entry.providers.join(', ')}`)
      return `${result.total} matches, showing ${result.families.length}:\n${lines.join('\n')}`
    },
  },
  {
    name: 'get_font',
    description: 'What a provider knows about one family: which weights it has (variable ranges look like "100 900"), styles, subsets and formats, and how many faces that resolves to.',
    inputSchema: object({
      family: string('Exact family name, e.g. "Fraunces".'),
      provider: { ...string('Ask one provider, instead of trying each in turn.'), enum: [...PROVIDER_NAMES] },
    }, ['family']),
    async run(args) {
      const family = String(args.family)
      const provider = args.provider as ProviderName | undefined
      const unifont = provider && provider !== 'adobe' ? await useProvider(provider) : await useUnifont()

      const properties = await unifont.getFontProperties(family)
      if (!properties) {
        return `No provider here knows "${family}". It might be on Adobe Fonts, which needs a Typekit id, or on npm.`
      }

      const resolved = await unifont.resolveFont(family, {
        weights: normaliseWeights(properties.weights ?? ['400']).weights,
        styles: properties.styles ?? ['normal'],
        subsets: properties.subsets ?? ['latin'],
        formats: ['woff2'],
      })

      return [
        `${family} (provider: ${properties.provider})`,
        `weights: ${properties.weights?.join(', ') ?? 'not reported'}`,
        `styles: ${properties.styles?.join(', ') ?? 'not reported'}`,
        `subsets: ${properties.subsets?.join(', ') ?? 'not reported'}`,
        `formats: ${properties.formats?.join(', ') ?? 'not reported'} (what the provider can serve, not what this family has)`,
        `fallbacks: ${resolved.fallbacks?.join(', ') || 'none suggested'}`,
        `resolves to ${resolved.fonts.length} faces across ${faceUrls(resolved.fonts).length} files`,
      ].join('\n')
    },
  },
  {
    name: 'get_font_css',
    description: '@font-face CSS for a family, ready to paste, with a metric-matched fallback face built by fontaine so the text doesn\'t move when the real font loads.',
    inputSchema: object({
      family: string('Exact family name.'),
      weights: string('Comma-separated, e.g. "400,700", or "100 900" for a variable range. Defaults to every weight published.'),
      styles: string('Comma-separated: normal, italic.'),
      subsets: string('Comma-separated, e.g. "latin,latin-ext".'),
      provider: { ...string('Ask one provider, instead of trying each in turn.'), enum: [...PROVIDER_NAMES] },
    }, ['family']),
    async run(args) {
      const family = String(args.family)
      const provider = args.provider as ProviderName | undefined
      const unifont = provider && provider !== 'adobe' ? await useProvider(provider) : await useUnifont()

      const properties = await unifont.getFontProperties(family)
      if (!properties) {
        return `No provider here knows "${family}".`
      }

      const resolved = await unifont.resolveFont(family, {
        weights: normaliseWeights(list(args.weights, properties.weights ?? ['400'])).weights,
        styles: list(args.styles, properties.styles ?? ['normal']) as ('normal' | 'italic' | 'oblique')[],
        subsets: list(args.subsets, properties.subsets ?? ['latin']),
        formats: ['woff2'],
      })

      if (!resolved.fonts.length) {
        return `Nothing matched that request. ${family} has weights ${properties.weights?.join(', ')} and subsets ${properties.subsets?.join(', ')}.`
      }

      const fallback = await metricFallbackCss(family, resolved.fonts, resolved.fallbacks ?? [])
      return [
        toFontFaceCss(family, resolved.fonts, { fallbacks: resolved.fallbacks, withMetricFallback: !!fallback }),
        fallback,
      ].filter(Boolean).join('\n\n')
    },
  },
  {
    name: 'compare_providers',
    description: 'Ask every provider that doesn\'t need credentials for the same family, and compare what each one offers: weight count, italic, subsets, face count, host and total size. Use this to decide which CDN to pull a family from.',
    inputSchema: object({ family: string('Exact family name.') }, ['family']),
    async run(args) {
      const family = String(args.family)
      const candidates = QUERYABLE_PROVIDERS.filter(name => name !== 'adobe' && name !== 'npm')

      const rows = await Promise.all(candidates.map(async (name) => {
        try {
          const unifont = await useProvider(name)
          const properties = await unifont.getFontProperties(family)
          if (!properties) {
            return `${name}: doesn't host this family`
          }
          const resolved = await unifont.resolveFont(family, {
            weights: normaliseWeights(properties.weights ?? ['400']).weights,
            styles: properties.styles ?? ['normal'],
            subsets: properties.subsets ?? ['latin'],
            formats: ['woff2'],
          })
          const urls = faceUrls(resolved.fonts)
          const host = urls[0] ? new URL(urls[0]).host : 'unknown'
          return `${name}: ${properties.weights?.length ?? 0} weights, ${properties.styles?.includes('italic') ? 'italic' : 'no italic'}, ${properties.subsets?.length ?? 0} subsets, ${resolved.fonts.length} faces, served from ${host}`
        }
        catch {
          return `${name}: request failed`
        }
      }))

      return `${family} across providers:\n${rows.join('\n')}`
    },
  },
  {
    name: 'check_coverage',
    description: 'Check whether a family can actually draw some text, by testing each character against the unicode-range of every face the provider returns. Use this before shipping a font for a language you haven\'t tested.',
    inputSchema: object({
      family: string('Exact family name.'),
      text: string('The text to check, e.g. "Zażółć gęślą jaźń".'),
    }, ['family', 'text']),
    async run(args) {
      const family = String(args.family)
      const text = String(args.text)
      const unifont = await useUnifont()

      const properties = await unifont.getFontProperties(family)
      if (!properties) {
        return `No provider here knows "${family}".`
      }

      const resolved = await unifont.resolveFont(family, {
        weights: ['400'],
        styles: ['normal'],
        subsets: properties.subsets ?? ['latin'],
        formats: ['woff2'],
      })

      const result = coverageForText(resolved.fonts, text)
      if (result.unrestricted) {
        return `${family} declares no unicode-range, so it promises nothing about coverage. Assume the file has whatever the foundry put in it.`
      }
      if (!result.missing.length) {
        return `${family} covers all ${result.covered.length} characters. Subsets you need: ${result.subsets.join(', ') || 'none reported'}.`
      }
      return `${family} is missing ${result.missing.length} character(s): ${result.missing.join(' ')}\nCovered by subsets: ${result.subsets.join(', ') || 'none reported'}.`
    },
  },
  {
    name: 'list_providers',
    description: 'The font providers unifont supports, where each one reads its metadata from, and how many families each will list.',
    inputSchema: object({}),
    async run() {
      // The cheapest way to find out which providers failed to answer.
      const catalogue = await searchCatalogue({ limit: 1 })
      const lines = PROVIDER_NAMES.map((name) => {
        const meta = PROVIDER_META[name]
        const flags = [
          meta.requiresOptions ? 'needs configuration' : undefined,
          catalogue.unavailable.includes(name) ? 'not answering' : undefined,
        ].filter(Boolean)
        return `${name}: ${meta.origin}${flags.length ? ` (${flags.join(', ')})` : ''}\n  ${meta.note}`
      })
      return lines.join('\n')
    },
  },
]
