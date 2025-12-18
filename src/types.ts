import type { formatMap } from './utils'

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

export type FontFormat = keyof typeof formatMap

export interface ResolveFontOptions<FamilyOptions extends Record<string, any> | never = never> {
  weights: string[]
  styles: FontStyles[]
  // TODO: improve support and support unicode range
  subsets: string[]
  formats: FontFormat[]
  options?: [FamilyOptions] extends [never] ? undefined : FamilyOptions
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

export interface InitializedProvider<
  FamilyOptions extends Record<string, any> = never,
> {
  resolveFont: (
    family: string,
    options: ResolveFontOptions<FamilyOptions>,
  ) => Awaitable<ResolveFontResult | undefined>
  listFonts?: (() => Awaitable<string[] | undefined>) | undefined
}

export interface ProviderDefinition<Options extends Record<string, any> = never, FamilyOptions extends Record<string, any> = never> {
  (options: Options, ctx: ProviderContext): Awaitable<InitializedProvider<FamilyOptions> | undefined>
}

export interface Provider<Name extends string = string, FamilyOptions extends Record<string, any> = never> {
  _name: Name
  _options: unknown
  (ctx: ProviderContext): Awaitable<InitializedProvider<FamilyOptions> | undefined>
}

export type ProviderFactory<Name extends string, Options extends Record<string, any> = never, FamilyOptions extends Record<string, any> = never>
  = [Options] extends [never]
    ? () => Provider<Name, FamilyOptions>
    : Partial<Options> extends Options
      ? (options?: Options) => Provider<Name, FamilyOptions>
      : (options: Options) => Provider<Name, FamilyOptions>
