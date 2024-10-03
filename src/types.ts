type Awaitable<T> = T | Promise<T>

interface ProviderContext {
  storage: {
    getItem: {
      <T = unknown>(key: string): Promise<T | null>
      <T = unknown>(key: string, init: () => Awaitable<T>): Promise<T>
    }
    setItem: (key: string, value: unknown) => Awaitable<void>
  }
}

export interface ResolveFontFacesOptions {
  weights: string[]
  styles: Array<'normal' | 'italic' | 'oblique'>
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

export interface InitializedProvider {
  resolveFontFaces: (family: string, options: ResolveFontFacesOptions) => Awaitable<undefined | {
  /**
   * Return data used to generate @font-face declarations.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face
   */
    fonts: FontFaceData[]
    fallbacks?: string[]
  }>
}

interface ProviderDefinition<T = unknown> {
  (options: T, ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

export interface Provider {
  _name: string
  (ctx: ProviderContext): Awaitable<InitializedProvider | undefined>
}

type ProviderFactory<T = unknown> =
  unknown extends T
    ? () => Provider
    : Partial<T> extends T
      ? (options?: T) => Provider
      : (options: T) => Provider

export function defineFontProvider<T = unknown>(name: string, provider: ProviderDefinition<T>): ProviderFactory<T> {
  return ((options: T) => Object.assign(provider.bind(null, options || {} as T), { _name: name })) as ProviderFactory<T>
}
