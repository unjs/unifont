import type { Font } from '@takumi-rs/core'
import { Renderer } from '@takumi-rs/core'
import { fromHtml } from '@takumi-rs/helpers/html'
import { useUnifont } from './unifont'

/**
 * sRGB equivalents of the OKLCH tokens in `app/assets/css/tokens.css`, restated because takumi
 * cannot resolve custom properties. Keep the two in step.
 */
export const OG_COLOURS = {
  paper: '#fcf9f7',
  paper2: '#f6f3ef',
  rule: '#dad7d3',
  neutral: '#898581',
  muted: '#5c5753',
  ink: '#1d1713',
  accent: '#c73800',
} as const

export const OG_SIZE = { width: 1200, height: 630 } as const

/** The site's own faces, resolved through unifont like everything else. */
const SITE_FACES = [
  { family: 'Newsreader', weight: '600', label: 'og-display' },
  { family: 'JetBrains Mono', weight: '400', label: 'og-mono' },
] as const

/** A stalled CDN must not hold an OG request open indefinitely. */
const FETCH_TIMEOUT = 10_000

async function fetchFace(family: string, weight: string) {
  const unifont = await useUnifont()
  const resolved = await unifont.resolveFont(family, {
    weights: [weight],
    styles: ['normal'],
    subsets: ['latin'],
    formats: ['woff2'],
  })
  for (const face of resolved.fonts) {
    for (const source of face.src) {
      if ('url' in source) {
        const url = source.url.startsWith('//') ? `https:${source.url}` : source.url
        const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) })
        if (response.ok) {
          return new Uint8Array(await response.arrayBuffer())
        }
      }
    }
  }
  return undefined
}

let base: Promise<Renderer> | undefined

/** One renderer with the site's faces registered. Building it costs two font downloads. */
function createBaseRenderer() {
  return (async () => {
    const renderer = new Renderer()
    for (const face of SITE_FACES) {
      const data = await fetchFace(face.family, face.weight)
      if (data) {
        await renderer.registerFont({ name: face.label, data, weight: Number(face.weight) } satisfies Font)
      }
    }
    return renderer
  })()
}

export function useOgRenderer() {
  if (!base) {
    const attempt = createBaseRenderer()
    // A rejected promise must not be cached, or one failed download breaks every later card.
    attempt.catch(() => {
      if (base === attempt) {
        base = undefined
      }
    })
    base = attempt
  }
  return base
}

/**
 * A renderer carrying one resolved family, so a font's card can be set in the font it is about.
 * Registering per request is why the route caches its output.
 */
export async function useSpecimenRenderer(family: string, weight: string) {
  const renderer = new Renderer()
  for (const face of SITE_FACES) {
    const data = await fetchFace(face.family, face.weight)
    if (data) {
      await renderer.registerFont({ name: face.label, data, weight: Number(face.weight) } satisfies Font)
    }
  }
  const specimen = await fetchFace(family, weight)
  if (!specimen) {
    return { renderer, hasSpecimen: false }
  }
  await renderer.registerFont({ name: 'og-specimen', data: specimen, weight: Number(weight) } satisfies Font)
  return { renderer, hasSpecimen: true }
}

function escape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export interface CardOptions {
  /** Small line above the headline. */
  kicker?: string
  headline: string
  /** Monospace line along the bottom. */
  meta?: string
  /** Render the headline in `og-specimen` rather than the site's display face. */
  specimen?: boolean
  /** Point size for the headline; long family names need less. */
  headlineSize?: number
  /** Weight for the headline. takumi instances a variable axis from `font-weight`. */
  headlineWeight?: number
}

/** The card as HTML, converted to a takumi node tree by the caller. */
export function cardHtml({ kicker, headline, meta, specimen, headlineSize, headlineWeight }: CardOptions) {
  const size = headlineSize ?? (headline.length > 22 ? 88 : headline.length > 14 ? 116 : 144)
  const headlineFamily = specimen ? 'og-specimen, og-display' : 'og-display'

  return `<div style="
      display: flex;
      flex-direction: column;
      width: ${OG_SIZE.width}px;
      height: ${OG_SIZE.height}px;
      background-color: ${OG_COLOURS.paper};
      padding: 64px 72px;
      justify-content: space-between;
    ">
      <div style="display: flex; flex-direction: column;">
        <div style="
          display: flex;
          font-family: og-display;
          font-size: 30px;
          color: ${OG_COLOURS.ink};
        ">unifont</div>
        <div style="
          display: flex;
          height: 3px;
          width: 100%;
          background-color: ${OG_COLOURS.ink};
          margin-top: 18px;
        "></div>
      </div>

      <div style="display: flex; flex-direction: column;">
        ${kicker
          ? `<div style="
              display: flex;
              font-family: og-mono;
              font-size: 24px;
              color: ${OG_COLOURS.neutral};
              margin-bottom: 20px;
            ">${escape(kicker)}</div>`
          : ''}
        <div style="
          display: flex;
          font-family: ${headlineFamily};
          font-weight: ${headlineWeight ?? 600};
          font-size: ${size}px;
          line-height: 1.04;
          letter-spacing: -0.03em;
          color: ${OG_COLOURS.ink};
        ">${escape(headline)}</div>
      </div>

      <div style="display: flex; align-items: center;">
        <div style="
          display: flex;
          width: 44px;
          height: 6px;
          background-color: ${OG_COLOURS.accent};
          margin-right: 20px;
        "></div>
        <div style="
          display: flex;
          font-family: og-mono;
          font-size: 24px;
          color: ${OG_COLOURS.muted};
        ">${escape(meta ?? 'unifont.dev')}</div>
      </div>
    </div>`
}

/** Titles for the site's fixed routes, so a card never falls back to a bare wordmark. */
const ROUTE_CARDS: Record<string, CardOptions> = {
  '': { headline: 'Every font CDN, one lookup', meta: 'unifont.dev' },
  'index': { headline: 'Every font CDN, one lookup', meta: 'unifont.dev' },
  'fonts': { headline: 'The catalogue', kicker: 'Every family the providers will list', meta: 'unifont.dev/fonts' },
  'compare': { headline: 'One family, every provider', kicker: 'Side by side', meta: 'unifont.dev/compare' },
  'api': { headline: 'The site is an API', kicker: 'Public, no auth, documented', meta: 'unifont.dev/api' },
  'docs': { headline: 'Documentation', kicker: 'Install, resolve, cache, extend', meta: 'unifont.dev/docs' },
}

/** Renders the share card for a site path. `fonts/<family>` is set in its own face. */
export async function renderOgCard(path: string, title?: string) {
  const segments = path ? path.split('/') : []
  let renderer = await useOgRenderer()
  let card: CardOptions

  if (segments[0] === 'fonts' && segments[1]) {
    const family = decodeURIComponent(segments[1])
    const unifont = await useUnifont()
    const properties = await unifont.getFontProperties(family).catch(() => undefined)

    const variable = properties?.weights?.find(weight => weight.includes(' '))
    const facts = [
      variable
        ? `variable ${variable}`
        : `${properties?.weights?.length ?? 0} ${properties?.weights?.length === 1 ? 'weight' : 'weights'}`,
      properties?.styles?.includes('italic') ? 'roman + italic' : 'roman only',
      properties?.subsets?.length ? `${properties.subsets.length} subsets` : undefined,
    ].filter(Boolean).join('  ·  ')

    // A variable range's minimum is often hairline, which makes a poor specimen.
    let specimenWeight = properties?.weights?.[0] ?? '400'
    if (variable) {
      const [min, max] = variable.split(/\s+/).map(Number)
      specimenWeight = String(Math.min(Math.max(500, min ?? 400), max ?? 900))
    }
    else if (properties?.weights?.length) {
      const numeric = properties.weights.map(Number).filter(Number.isFinite)
      specimenWeight = String(numeric.includes(500)
        ? 500
        : numeric.reduce(
            (best, weight) => (Math.abs(weight - 500) < Math.abs(best - 500) ? weight : best),
            numeric[0]!,
          ))
    }
    const built = await useSpecimenRenderer(family, specimenWeight)
    renderer = built.renderer

    card = {
      kicker: properties?.provider ? `resolved from ${properties.provider}` : 'not on any provider here',
      headline: title ?? family,
      meta: facts || 'unifont.dev',
      specimen: built.hasSpecimen,
      headlineWeight: Number(specimenWeight),
    }
  }
  else if (segments[0] === 'docs' && segments[1]) {
    card = {
      kicker: 'Documentation',
      headline: title ?? segments[1].replaceAll('-', ' '),
      meta: `unifont.dev/${path}`,
    }
  }
  else {
    const known = ROUTE_CARDS[segments[0] ?? ''] ?? { headline: title ?? 'unifont', meta: 'unifont.dev' }
    card = { ...known, headline: title ?? known.headline }
  }

  const { node } = fromHtml(cardHtml(card))
  return renderer.render(node, { ...OG_SIZE, format: 'png' })
}
