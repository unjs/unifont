type Awaitable<T> = T | Promise<T>

export interface ProviderContext {
  storage: {
    getItem: {
      <T = unknown>(key: string): Promise<T | null>
      <T = unknown>(key: string, init: () => Awaitable<T>): Promise<T>
    }
    setItem: (key: string, value: unknown) => Awaitable<void>
  }
}

export type FontStyles = 'normal' | 'italic' | 'oblique'

export interface ResolveFontOptions {
  weights: string[]
  styles: FontStyles[]
  // TODO: improve support and support unicode range
  subsets: string[]
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
   * The subset name of the font face. Many fonts provides font subsets such as latin, latin-ext, cyrillic, etc.
   */
  subset?: string
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
}

export interface InitializedProvider {
  resolveFont: (family: string, options: ResolveFontOptions) => Awaitable<ResolveFontResult | undefined>
  listFonts?: (() => Awaitable<string[] | undefined>) | undefined
}

export interface ProviderDefinition<T = unknown> {
  (options: T, ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export interface Provider<TName extends string = string> {
  _name: TName
  (ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export type ProviderFactory<TName extends string, TOptions = unknown>
  = unknown extends TOptions
    ? () => Provider<TName>
    : Partial<TOptions> extends TOptions
      ? (options?: TOptions) => Provider<TName>
      : (options: TOptions) => Provider<TName>
