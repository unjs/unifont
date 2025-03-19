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
  fallbacks?: string[]
  /**
   * Specifies the specific characters / icons to download.
   * This can reduce the size of the font file.
   *
   * Currently only supported by Google Fonts / Google Icons (Only available specifying the new 'Material Symbols' icons).
   */
  glyphs?: string[]
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
}

export interface ProviderDefinition<T = unknown> {
  (options: T, ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export interface Provider {
  _name: string
  (ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export type ProviderFactory<T = unknown> =
  unknown extends T
    ? () => Provider
    : Partial<T> extends T
      ? (options?: T) => Provider
      : (options: T) => Provider
