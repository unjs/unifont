# unifont proxy

A CORS-enabled, read-only, cached proxy in front of the font APIs `unifont` talks to, for
environments (browsers, web containers) that cannot call them directly.

This directory is the whole thing: a small Nitro app with no database, no credentials and no
environment variables. **It is meant to be self-hosted.** Deploy it wherever you already deploy,
and point `apiBase` at your deployment:

```ts
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
], { apiBase: 'https://fonts.example.com' })
```

> [!WARNING]
> The deployment at `https://proxy.unifont.dev` is **experimental and not for production use**.
> It exists for convenience, so playgrounds, StackBlitz demos and issue reproductions work without
> anyone having to deploy anything first. It is best-effort, offers no uptime guarantee, may be
> rate-limited, and may change or disappear without notice. Anything beyond a demo should run its
> own copy of this directory.

## When you need it

No provider API except `npm` sends CORS headers, so a browser cannot call them. `unifont` detects
that (a `window`, or a StackBlitz web container) and routes provider requests through
`https://proxy.unifont.dev` unless you say otherwise. On a server, in a worker or in CI, nothing is
proxied and this app is not involved at all.

So you need a deployment of your own if you resolve fonts in the browser at runtime, or in a web
container, and you need that to keep working. If your resolution happens at build time (which is
what `@nuxt/fonts` and `fontless` do), you do not need a proxy.

Pass `apiBase: false` to opt out entirely and always call the provider APIs directly.

## What it will and won't do

It is not an open relay. Requests are matched against the fixed table below and rejected otherwise:

- Only `GET` and `HEAD`, and only the routes listed here. Unknown paths are a `404`.
- Only query parameters named per route; everything else is dropped before the upstream call.
- Only the upstream `content-type` is carried back. No other upstream header is replayed.
- No credentials, no cookies, no auth of any kind, in either direction.
- Font files are never proxied. They come from the provider's own CDN, which already allows
  cross-origin requests.

## Endpoints

`GET /` returns the machine-readable endpoint list. Every endpoint is `GET`-only and versioned:

| Route | Upstream | Query |
| --- | --- | --- |
| `/adobe/v1/kit/:id` | `typekit.com/api/v1/json/kits/:id/published` | |
| `/adobe/v1/kit-css/:id` | `use.typekit.net/:id.css` | |
| `/bunny/v1/list` | `fonts.bunny.net/list` | |
| `/bunny/v1/css` | `fonts.bunny.net/css` | `family` |
| `/fontshare/v1/fonts` | `api.fontshare.com/v2/fonts` | `offset`, `limit` |
| `/fontshare/v1/css` | `api.fontshare.com/v2/css` | `f[]` |
| `/fontsource/v1/fonts` | `api.fontsource.org/v1/fonts` | |
| `/fontsource/v1/fonts/:id` | `api.fontsource.org/v1/fonts/:id` | |
| `/fontsource/v1/variable/:id` | `api.fontsource.org/v1/variable/:id` | |
| `/google/v1/fonts` | `fonts.google.com/metadata/fonts` | |
| `/google/v1/css` | `fonts.googleapis.com/css2` | `family`, `text`, `icon_names`, `format` |
| `/google/v1/icons` | `fonts.google.com/metadata/icons` | |
| `/google/v1/icon` | `fonts.googleapis.com/icon` | `family`, `format` |

`format` is one of `woff2` (default), `woff`, `ttf` or `eot`, and is mapped to the user agent Google
expects for that format.

Responses carry `cache-control` (`public`, `max-age` = `s-maxage`, plus `stale-while-revalidate`),
an `etag` and `304` support. Metadata is cached for 6 hours, generated CSS for a day, Adobe kits for
5 minutes.

## Development

```bash
pnpm dev      # http://localhost:3000
pnpm test
pnpm build
```

## Deployment

Any Nitro-supported host works, and nothing here needs environment variables or credentials.

- **Vercel, Netlify, Cloudflare:** create a project with this directory as the root. Nitro detects
  the preset from the environment; the build command is `pnpm build`.
- **Node:** `pnpm build`, then run `.output/server/index.mjs`.

A fresh deployment is cold: the first request for each upstream endpoint pays the upstream
round-trip. The in-process cache is per-instance, so on a serverless host most of the benefit comes
from the CDN in front, which the `cache-control` headers above are written for.

Once it is up, `GET /` should return the endpoint list, and pointing `apiBase` at it is the only
change your application needs:

```ts
const unifont = await createUnifont([providers.google()], {
  apiBase: 'https://fonts.example.com',
})
```
