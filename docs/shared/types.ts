import type { Profile } from '#server/utils/pds'
import type { Infer } from 'airspace/lexicon'
import type lexicons from './lexicons'

export type { ContributorsResponse } from '#server/api/v1/contributors.get'
export type { CompareResponse, CompareRow } from '#server/api/v1/fonts/[family]/compare.get'
export type { TransferResponse } from '#server/api/v1/fonts/[family]/transfer.get'
export type { BaselineTransferResponse } from '#server/api/v1/transfer.get'
export type { ProvidersResponse, ProviderSummary } from '#server/api/v1/providers.get'
export type { StacksResponse } from '#server/api/v1/stacks/index.get'
export type { BaselineTransfer } from '#server/utils/transfer'
export type { Profile as StackAuthor } from '#server/utils/pds'

export type StackRecord = Infer<(typeof lexicons)['stack']>
export type StackRole = StackRecord['roles'][number]

export interface PublishedStack {
  rkey: string
  author: Profile
  stack: StackRecord
}

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
