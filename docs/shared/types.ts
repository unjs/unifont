export const PROVIDER_NAMES = ['google', 'bunny', 'fontshare', 'fontsource', 'googleicons', 'adobe', 'npm'] as const

export type ProviderName = typeof PROVIDER_NAMES[number]

export interface ProviderMeta {
  name: ProviderName
  label: string
  /** Host the metadata is read from. */
  origin: string
  /** Whether the provider needs per-user configuration before unifont can use it. */
  requiresOptions: boolean
  note: string
}

export interface ProviderSummary extends ProviderMeta {
  /** `null` when the provider cannot enumerate its library. */
  families: number | null
  unavailable: boolean
}

/** Declared by hand: `defineCachedHandler` does not carry its return type to the fetch layer. */
export interface ProvidersResponse {
  providers: ProviderSummary[]
}

/** Declared by hand: `defineCachedHandler` erases its return type. */
export interface TransferResponse {
  family: string
  faces: number
  files: number
  /** How many files reported a `content-length`. */
  measured: number
  bytes: number
}

export interface Contributor {
  login: string
  avatar: string
  url: string
  contributions: number
}

/** Declared by hand: `defineCachedHandler` erases its return type. */
export interface ContributorsResponse {
  contributors: Contributor[]
  /** `true` when GitHub did not answer, so the footer can stay quiet. */
  unavailable: boolean
}

export interface CompareRow {
  provider: string
  label: string
  available: boolean
  origin?: string
  weights?: string[] | null
  styles?: string[] | null
  subsets?: string[] | null
  formats?: string[] | null
  faces?: number
  files?: number
  bytes?: number
  measured?: number
  host?: string | null
  sample?: string | null
  fallbacks?: string[]
  error?: string
}

/** Declared by hand: `defineCachedHandler` erases its return type. */
export interface CompareResponse {
  family: string
  results: CompareRow[]
}
