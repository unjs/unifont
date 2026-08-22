# unifont proxy

A CORS-enabled, read-only, cached proxy in front of the font APIs `unifont` talks to, for
environments (browsers, web containers) that cannot call them directly.

```ts
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
], { apiBase: 'https://proxy.unifont.dev' })
```

> [!WARNING]
> The deployment at `https://proxy.unifont.dev` is **experimental and not for production use**.
> It exists so reproductions and playgrounds work in web containers. It is best-effort, offers no
> uptime guarantee, may be rate-limited, and may change or disappear without notice.
> Production users should deploy this directory themselves and point `apiBase` at that.

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

Any Nitro-supported host works. On Vercel, create a project with this directory as the root; Nitro
detects the preset. Nothing here needs environment variables or credentials.
