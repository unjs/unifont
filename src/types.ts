type Awaitable<T> = T | Promise<T>

interface CacheKeyUtils {
  hash: (value: unknown) => string
  join: (...parts: Array<string | number>) => string
}

export type CacheKeyBuilder = (utils: CacheKeyUtils) => string

export interface ProviderContext {
  storage: {
    getItem: {
      <T = unknown>(key: string): Promise<T | null>
      <T = unknown>(key: string, init: () => Awaitable<T>): Promise<T>
    }
    setItem: (key: string, value: unknown) => Awaitable<void>
  }

  /**
   * Build a safe cache key bound to the provider and its options.
   * Provider name and bound provider options are automatically included in the final key.
   *
   * Format: `"<provider>:<hash>-<body?>-<label>"` (body omitted if empty).
   * All parts are sanitized to `[\w.-]` and joined with `-`.
   *
   * Example (meta):
   * ```ts
   * const key = ctx.cacheKey('meta.json')
   * const meta = await ctx.storage.getItem(key, fetchMeta)
   * ```
   *
   * Example (data):
   * ```ts
   * const key = ctx.cacheKey('data.json', ({ hash, join }) => join(fontFamily, hash(options)))
   * const data = await ctx.storage.getItem(key, () => getFontDetails(fontFamily, options))
   * ```
   */
  cacheKey: (label: string, build?: CacheKeyBuilder) => string
}

export type FontStyles = 'normal' | 'italic' | 'oblique'

export interface ResolveFontOptions {
  weights: string[]
  styles: FontStyles[]
  // TODO: improve support and support unicode range
  subsets: string[]
  fallbacks?: string[]
}

export interface RemoteFontSource {
  url: string
  originalURL?: string
  format?: string
  tech?: string
}

export interface LocalFontSource {
  name: string
}

export interface FontFaceMeta {
  /** The priority of the font face, usually used to indicate fallbacks. Smaller is more prioritized. */
  priority?: number
  /**
   * A `RequestInit` object that should be used when fetching this font. This can be useful for
   * adding authorization headers and other metadata required for a font request.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
   */
  init?: RequestInit
}

// TODO: name
export interface FontFaceData {
  src: Array<LocalFontSource | RemoteFontSource>
  /**
   * The font-display descriptor.
   * @default 'swap'
   */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  /** A font-weight value. */
  weight?: string | number | [number, number]
  /** A font-stretch value. */
  stretch?: string
  /** A font-style value. */
  style?: string
  /** The range of Unicode code points to be used from the font. */
  unicodeRange?: string[]
  /** Allows control over advanced typographic features in OpenType fonts. */
  featureSettings?: string
  /** Allows low-level control over OpenType or TrueType font variations, by specifying the four letter axis names of the features to vary, along with their variation values. */
  variationSettings?: string
  /** Metadata for the font face used by unifont */
  meta?: FontFaceMeta
}

export interface ResolveFontResult {
  /**
   * Return data used to generate @font-face declarations.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face
   */
  fonts: FontFaceData[]
  fallbacks?: string[]
}

export interface InitializedProvider {
  resolveFont: (family: string, options: ResolveFontOptions) => Awaitable<ResolveFontResult | undefined>
  listFonts?: (() => Awaitable<string[] | undefined>) | undefined
}

export interface ProviderDefinition<T = unknown> {
  (options: T, ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export interface Provider {
  _name: string
  _providerOptions: unknown // Bound options passed when creating the provider (used for cache key hashing).
  (ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export type ProviderFactory<T = unknown>
  = unknown extends T
    ? () => Provider
    : Partial<T> extends T
      ? (options?: T) => Provider
      : (options: T) => Provider
