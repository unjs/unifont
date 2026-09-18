import type { Airspace } from 'airspace'
import type { BrowserOAuth, OAuthSession } from 'airspace/oauth/browser'
import type { stacks } from '#shared/collections'
import { OAUTH_CLIENT } from '#shared/atproto'

type StackAirspace = Airspace<{ stacks: typeof stacks }, Record<never, never>>

interface AtprotoSession {
  did: string
  handle: string
  airspace: StackAirspace
}

async function stackAirspace(did: string, session: OAuthSession): Promise<StackAirspace> {
  const [{ createAirspace }, { stacks }] = await Promise.all([import('airspace'), import('#shared/collections')])
  return createAirspace({ identity: did, collections: { stacks }, session })
}

let oauth: Promise<BrowserOAuth> | undefined

/** Loaded on demand, so a page carries no OAuth client until one is needed. */
function client() {
  oauth ??= (async () => {
    const [{ createBrowserOAuth }, { STACK_SCOPES }] = await Promise.all([
      import('airspace/oauth/browser'),
      import('#shared/collections'),
    ])
    return createBrowserOAuth({
      baseUrl: useRuntimeConfig().public.siteUrl || window.location.origin,
      ...OAUTH_CLIENT,
      scopes: STACK_SCOPES,
    })
  })()
  return oauth
}

const session = shallowRef<AtprotoSession | null>(null)
let restored: Promise<void> | undefined

/** Set while a session may exist, so other visitors never load the OAuth client. */
const SIGNED_IN = 'unifont-atproto'

export function useAtprotoSession() {
  function restore() {
    restored ??= (async () => {
      const result = await client().then(client => client.init()).catch(() => null)
      if (!result) {
        localStorage.removeItem(SIGNED_IN)
        return
      }
      const airspace = await stackAirspace(result.did, result.session)
      const identity = await airspace.identity().catch(() => null)
      session.value = { did: result.did, handle: identity?.handle || result.did, airspace }
    })()
    return restored
  }

  onMounted(() => {
    if (localStorage.getItem(SIGNED_IN) || window.location.hash.includes('state=')) {
      restore()
    }
  })

  async function signIn(handle: string) {
    // OAuth needs `crypto.subtle`, which a browser withholds outside a secure context.
    if (!window.isSecureContext) {
      throw new Error('Signing in needs https. Use localhost rather than a local network address, or a tunnel.')
    }
    localStorage.setItem(SIGNED_IN, '1')
    try {
      await client().then(client => client.signIn(handle.trim().replace(/^@/, '')))
    }
    catch (error) {
      localStorage.removeItem(SIGNED_IN)
      throw error
    }
  }

  async function signOut() {
    const did = session.value?.did
    session.value = null
    localStorage.removeItem(SIGNED_IN)
    if (did) {
      await client().then(client => client.revoke(did)).catch(() => {})
    }
  }

  return { session, signIn, signOut }
}
