const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * The user agent Google's `css2` and `icon` endpoints require to serve each format.
 * @see https://stackoverflow.com/questions/25011533/google-font-api-uses-browser-detection-how-to-get-all-font-variations-for-font
 */
export const userAgents = {
  eot: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
  ttf: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
  woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
} as const

export type FontFormat = keyof typeof userAgents

export interface UpstreamRequest {
  url: string
  headers?: Record<string, string>
}

export interface EndpointInput {
  params: Record<string, string>
  query: URLSearchParams
}

export interface Endpoint {
  /** Route pattern, matched with `rou3` (`:name` matches a single segment). */
  route: string
  /** Cache key namespace. Must be unique. */
  name: string
  /** Seconds a cached response is served without contacting the upstream. */
  maxAge: number
  /** Seconds past `maxAge` a cached response may still be served while it refreshes. */
  staleMaxAge: number
  /** Query parameters that reach the upstream and vary the cache key. Anything else is stripped. */
  allowQuery?: string[]
  resolve: (input: EndpointInput) => UpstreamRequest
}

/** Thrown for a request that fails validation, and translated to a `400` by the route handler. */
export class InvalidRequestError extends Error {}

function invalid(message: string): never {
  throw new InvalidRequestError(message)
}

function param(input: EndpointInput, name: string, pattern: RegExp, maxLength: number): string {
  const value = input.params[name] ?? ''
  if (value.length > maxLength || !pattern.test(value)) {
    invalid(`Invalid \`${name}\`.`)
  }
  return value
}

function query(input: EndpointInput, name: string, pattern: RegExp, maxLength: number): string | undefined {
  const value = input.query.get(name)
  if (value === null) {
    return undefined
  }
  if (value.length > maxLength || !pattern.test(value)) {
    invalid(`Invalid \`${name}\` query parameter.`)
  }
  return value
}

/** For values with no safe charset, such as glyph subsets. */
function encodedQuery(input: EndpointInput, name: string, maxLength: number): string | undefined {
  const value = input.query.get(name)
  if (value === null) {
    return undefined
  }
  if (value.length > maxLength) {
    invalid(`Invalid \`${name}\` query parameter.`)
  }
  return encodeURIComponent(value)
}

function requiredQuery(input: EndpointInput, name: string, pattern: RegExp, maxLength: number): string {
  return query(input, name, pattern, maxLength) ?? invalid(`Missing \`${name}\` query parameter.`)
}

function userAgent(input: EndpointInput): string {
  const format = input.query.get('format') ?? 'woff2'
  if (!(format in userAgents)) {
    invalid(`Invalid \`format\` query parameter. Expected one of \`${Object.keys(userAgents).join('`, `')}\`.`)
  }
  return userAgents[format as FontFormat]
}

/**
 * Appends pre-validated values with minimal encoding: Google's `family` syntax
 * (`Roboto:ital,wght@0,400;1,700`) and Fontshare's `f[]` are mangled by `URLSearchParams`.
 */
function withQuery(url: string, params: Array<[string, string | undefined]>): string {
  const search = params
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${value.replaceAll(' ', '+')}`)
  if (search.length === 0) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}${search.join('&')}`
}

const KIT_ID = /^[a-z0-9]+$/i
const FONT_ID = /^[a-z0-9-]+$/i
const NUMERIC = /^\d+$/
const BUNNY_FAMILY = /^[\w\-,:]+$/
const FONTSHARE_FAMILY = /^[\w\-,@.]+$/
const GOOGLE_FAMILY = /^[\w\-,.:;@+ ]+$/
const ICON_NAMES = /^[a-z0-9_,]+$/

export const endpoints: Endpoint[] = [
  {
    route: '/adobe/v1/kit/:id',
    name: 'adobe-kit',
    maxAge: 5 * MINUTE,
    staleMaxAge: HOUR,
    resolve: input => ({
      url: `https://typekit.com/api/v1/json/kits/${param(input, 'id', KIT_ID, 64)}/published`,
    }),
  },
  {
    route: '/adobe/v1/kit-css/:id',
    name: 'adobe-kit-css',
    maxAge: 5 * MINUTE,
    staleMaxAge: HOUR,
    resolve: input => ({
      url: `https://use.typekit.net/${param(input, 'id', KIT_ID, 64)}.css`,
    }),
  },
  {
    route: '/bunny/v1/list',
    name: 'bunny-list',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: () => ({ url: 'https://fonts.bunny.net/list' }),
  },
  {
    route: '/bunny/v1/css',
    name: 'bunny-css',
    maxAge: DAY,
    staleMaxAge: WEEK,
    allowQuery: ['family'],
    resolve: input => ({
      url: withQuery('https://fonts.bunny.net/css', [
        ['family', requiredQuery(input, 'family', BUNNY_FAMILY, 512)],
      ]),
    }),
  },
  {
    route: '/fontshare/v1/fonts',
    name: 'fontshare-fonts',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    allowQuery: ['offset', 'limit'],
    resolve: input => ({
      url: withQuery('https://api.fontshare.com/v2/fonts', [
        ['offset', query(input, 'offset', NUMERIC, 8)],
        ['limit', query(input, 'limit', NUMERIC, 3)],
      ]),
    }),
  },
  {
    route: '/fontshare/v1/css',
    name: 'fontshare-css',
    maxAge: DAY,
    staleMaxAge: WEEK,
    allowQuery: ['f[]'],
    resolve: input => ({
      url: withQuery('https://api.fontshare.com/v2/css', [
        ['f[]', requiredQuery(input, 'f[]', FONTSHARE_FAMILY, 512)],
      ]),
    }),
  },
  {
    route: '/fontsource/v1/fonts',
    name: 'fontsource-fonts',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: () => ({ url: 'https://api.fontsource.org/v1/fonts' }),
  },
  {
    route: '/fontsource/v1/fonts/:id',
    name: 'fontsource-font',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: input => ({
      url: `https://api.fontsource.org/v1/fonts/${param(input, 'id', FONT_ID, 128)}`,
    }),
  },
  {
    route: '/fontsource/v1/variable/:id',
    name: 'fontsource-variable',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: input => ({
      url: `https://api.fontsource.org/v1/variable/${param(input, 'id', FONT_ID, 128)}`,
    }),
  },
  {
    route: '/google/v1/fonts',
    name: 'google-fonts',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: () => ({ url: 'https://fonts.google.com/metadata/fonts' }),
  },
  {
    route: '/google/v1/css',
    name: 'google-css',
    maxAge: DAY,
    staleMaxAge: WEEK,
    allowQuery: ['family', 'text', 'icon_names', 'format'],
    resolve: input => ({
      url: withQuery('https://fonts.googleapis.com/css2', [
        ['family', requiredQuery(input, 'family', GOOGLE_FAMILY, 1024)],
        ['text', encodedQuery(input, 'text', 512)],
        ['icon_names', query(input, 'icon_names', ICON_NAMES, 4096)],
      ]),
      headers: { 'user-agent': userAgent(input) },
    }),
  },
  {
    route: '/google/v1/icons',
    name: 'google-icons',
    maxAge: 6 * HOUR,
    staleMaxAge: DAY,
    resolve: () => ({
      url: 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true',
    }),
  },
  {
    route: '/google/v1/icon',
    name: 'google-icon',
    maxAge: DAY,
    staleMaxAge: WEEK,
    allowQuery: ['family', 'format'],
    resolve: input => ({
      url: withQuery('https://fonts.googleapis.com/icon', [
        ['family', requiredQuery(input, 'family', GOOGLE_FAMILY, 128)],
      ]),
      headers: { 'user-agent': userAgent(input) },
    }),
  },
]
