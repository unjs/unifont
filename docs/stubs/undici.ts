/**
 * A no-op stand-in for `undici`, aliased into the server build.
 *
 * `unifont` imports it dynamically to install `EnvHttpProxyAgent` when `HTTPS_PROXY` is set, which
 * pulls 989 kB into the bundle for a path this deployment never takes. Reporting no dispatcher is
 * enough for `unifont` to leave the global one alone; a host that needs a proxy can run node with
 * `--use-env-proxy`.
 */
export class EnvHttpProxyAgent {
  readonly stub = true
}

export function getGlobalDispatcher(): undefined {
  return undefined
}

export function setGlobalDispatcher(): void {}
