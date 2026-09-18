import { defineCollections, scopesFor } from 'airspace'
import lexicons from './lexicons'

export const { stack: stacks } = defineCollections(lexicons, {
  stack: { sort: [['createdAt', 'desc']] },
})

/** Must match the scopes declared in the OAuth client metadata document. */
export const STACK_SCOPES = scopesFor({ collections: { stacks } })
