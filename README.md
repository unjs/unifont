# unifont

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> Framework agnostic tools for accessing data from font CDNs and providers.

📖 [Documentation](https://unifont.dev/docs) · 🔍 [Catalogue](https://unifont.dev/fonts) · ⚖️ [Compare providers](https://unifont.dev/compare) · 🧩 [HTTP API](https://unifont.dev/api)

Every font CDN is reached a different way. Google returns a stylesheet you have to parse, Fontshare
returns JSON with its own names for weights, and Adobe wants a project id. `unifont` is one layer
over all of them: ask for a family, and get back weights, styles, subsets, unicode ranges and
`@font-face` data in the same shape every time.

## Installation

```bash
npm i unifont
pnpm add unifont
yarn add unifont
```

## Getting started

This package is ESM-only.

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontshare(),
])

const availableFonts = await unifont.listFonts()
const properties = await unifont.getFontProperties('Poppins')
const { fonts, fallbacks } = await unifont.resolveFont('Poppins', {
  weights: ['400', '700'],
  subsets: ['latin'],
})
```

Providers are tried in order, and the first one that knows the family answers.

[Getting started](https://unifont.dev/docs/getting-started) walks through it.
The [API reference](https://unifont.dev/docs/reference) has every option and signature.

## Built-in providers

```js
providers.google()
providers.bunny()
providers.fontshare()
providers.fontsource()
providers.googleicons()
providers.npm()
providers.adobe({ id: process.env.TYPEKIT_ID })
```

[Providers](https://unifont.dev/docs/providers) covers what each one serves and the options it
takes. You can also [write your own](https://unifont.dev/docs/custom-providers).

In a browser or a web container, CORS blocks every provider API except `npm`, so `unifont` sends
those requests through a proxy instead. See
[Browser and web containers](https://unifont.dev/docs/browser).

> [!WARNING]
> The default `https://proxy.unifont.dev` is **experimental and not for production use**. It's there
> so reproductions and playgrounds work in web containers like StackBlitz without anyone deploying
> anything first. It's best-effort, it may be rate-limited, and it may change or disappear without
> notice. For anything else, deploy [`proxy/`](./proxy) and point `apiBase` at it.

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

[unifont.dev](https://unifont.dev) lives in [`docs/`](./docs). It's a Nuxt app that runs on the
built package, so run `pnpm build` before `pnpm docs`. Its prose is Markdown in
[`docs/content`](./docs/content), served through [Comark Content](https://content.comark.dev).
Everything else comes from `unifont` at request time.

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://npmx.dev/api/registry/badge/version/unifont
[npm-version-href]: https://npmx.dev/package/unifont
[npm-downloads-src]: https://npmx.dev/api/registry/badge/downloads/unifont
[npm-downloads-href]: https://npm.chart.dev/unifont
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/unifont/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/unjs/unifont/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/unifont/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/unifont
