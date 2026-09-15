import type { GoogleProviderOptions } from './providers/google'
import type { GoogleiconsProviderOptions } from './providers/googleicons'

export * as providers from './providers'
export type { AdobeProviderOptions } from './providers/adobe'
export type { GoogleFamilyOptions, GoogleProviderOptions } from './providers/google'
export type { GoogleiconsFamilyOptions, GoogleiconsProviderOptions } from './providers/googleicons'
export type { NpmFamilyOptions, NpmProviderOptions } from './providers/npm'
export type { FontAxis, FontFaceData, FontFaceMeta, FontMetrics, FontProperties, FontStyles, InitializedProvider, LocalFontSource, Provider, ProviderContext, ProviderDefinition, ProviderFactory, RemoteFontSource, ResolvedVariableAxis, ResolveFontOptions, ResolveFontResult, VariableAxis, VariableAxisValue } from './types'
export type { Unifont, UnifontOptions } from './unifont'

export { createUnifont, defaultResolveOptions } from './unifont'
export { defineFontProvider } from './utils'

/** @deprecated */
export type GoogleOptions = GoogleProviderOptions
/** @deprecated */
export type GoogleiconsOptions = GoogleiconsProviderOptions
