/** No imports here: a page rendering a stack must not pull in the lexicon builder. */
export const NAMESPACE = 'dev.unifont'

export const STACK_COLLECTION = `${NAMESPACE}.stack`

/** Every stack record links here, so a backlink index can enumerate the collection. */
export const STACK_APP_URI = 'https://unifont.dev/stack'

/** The key a backlink index joins stacks on. */
export function familyUri(family: string) {
  return `https://unifont.dev/fonts/${encodeURIComponent(family)}`
}

export function stackPath(handle: string, rkey: string) {
  return `/stacks/@${handle}/${rkey}`
}

/** Shared by the client and the metadata document it is validated against. */
export const OAUTH_CLIENT = {
  redirectPath: '/stack',
  metadataPath: '/oauth-client-metadata.json',
  name: 'unifont.dev',
} as const
