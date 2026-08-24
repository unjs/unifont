# unifont proxy

A CORS-enabled, read-only, cached proxy in front of the font APIs `unifont` talks to, for
environments (browsers, web containers) that cannot call them directly.

This directory is the whole thing: a small Nitro app with no database, no credentials and no
environment variables. **It is meant to be self-hosted.** Deploy it wherever you already deploy, and
point `apiBase` at your deployment:

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

[Self-hosting the proxy](https://unifont.dev/docs/proxy) documents what it will and won't do, the
endpoints it serves, and how to deploy it. [Browser and web containers](https://unifont.dev/docs/browser)
covers when `unifont` reaches for a proxy, and how to point it elsewhere or turn it off.

## Development

```bash
pnpm dev      # http://localhost:3000
pnpm test
pnpm build
```
