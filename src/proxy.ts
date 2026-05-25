// Node's built-in `fetch` (undici) ignores `HTTPS_PROXY` / `HTTP_PROXY`
// unless launched with `node --use-env-proxy` (Node 24+, experimental).
//
// We wire up undici's `EnvHttpProxyAgent` as the global dispatcher when
// a proxy env var is present and the user has not already installed their own
// dispatcher (custom `ProxyAgent`, `MockAgent`, undici interceptors, ...).
//
// See:
//   https://nodejs.org/api/cli.html#--use-env-proxy
//   https://undici.nodejs.org/#/docs/api/EnvHttpProxyAgent

import process from 'node:process'

let installed = false

export async function installProxyDispatcher(): Promise<void> {
  if (installed)
    return
  installed = true

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy
  if (!proxyUrl)
    return

  try {
    const { Agent, EnvHttpProxyAgent, getGlobalDispatcher, setGlobalDispatcher } = await import('undici')
    const current = getGlobalDispatcher()
    if (current instanceof Agent && !(current instanceof EnvHttpProxyAgent)) {
      setGlobalDispatcher(new EnvHttpProxyAgent())
    }
  }
  catch {
    // 🤷‍♂️ what can you do?
  }
}
