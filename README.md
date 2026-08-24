# unifont

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> Framework agnostic tools for accessing data from font CDNs and providers.

[unifont.dev](https://unifont.dev) is the documentation site, a searchable catalogue of every family the
providers will list, a per-family inspector (metadata, specimen, unicode coverage, ready-to-paste CSS), a
provider comparison view, and a public HTTP API. It lives in [`docs/`](./docs) and runs on this package.

## Installation

Using npm:

```
npm i unifont
```

Using pnpm:

```
pnpm add unifont
```

Using yarn:

```
yarn add unifont
```

## Getting started

This package is ESM-only.

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const availableFonts = await unifont.listFonts()
const properties = await unifont.getFontProperties('Poppins')
const { fonts, fallbacks } = await unifont.resolveFont('Poppins')
```

`unifont` honours the `HTTPS_PROXY` / `HTTP_PROXY` (and lower-case) environment variables for outbound font metadata and binary fetches at build time, so it works behind corporate proxies without extra configuration.

## Built-in providers

The following providers are built-in but you can build [custom providers](#building-your-own-provider) too.

### Using providers in the browser

Apart from `npm`, no built-in provider's API can be called from a browser or a web container. In those environments `unifont` routes requests through `https://proxy.unifont.dev`, a deployment of the [proxy in this repository](./proxy), so no configuration is needed:

```js
import { createUnifont, providers } from 'unifont'

// in a browser or a StackBlitz web container, this goes via the proxy
const unifont = await createUnifont([providers.google()])
```

Detection covers browsers and StackBlitz web containers, whose Node process is served by the browser and so is bound by the same CORS rules. Everywhere else the provider APIs are requested directly. Point `apiBase` at your own deployment to override it, or pass `false` to always request the provider APIs directly:

```js
const unifont = await createUnifont([providers.google()], {
  apiBase: 'https://fonts.example.com', // or `false` to never proxy
})
```

The proxy serves a fixed list of upstream endpoints, not arbitrary URLs. Only requests to those endpoints are rewritten; everything else, such as the npm CDNs or a [custom provider's](#building-your-own-provider) own API, is requested directly, as is everything when `apiBase` is unset.

> [!WARNING]
> `https://proxy.unifont.dev` is **experimental and not for production use**. It is a convenience, so that reproductions and playgrounds work in web containers such as StackBlitz without anyone deploying anything first. It is best-effort, may be rate-limited, and may change or disappear without notice.
>
> The proxy is built to be self-hosted: it is a small Nitro app in [this repository](./proxy) with no database, credentials or environment variables. Deploy that directory and point `apiBase` at it.

### Adobe

A provider for [Adobe Fonts](https://fonts.adobe.com/).

```js
import { providers } from 'unifont'

providers.adobe({ /* options */ })
```

#### Options

##### `id`

- Type: `string | string[]`
- Required

```js
import { providers } from 'unifont'

providers.adobe({ id: 'your-id' })
providers.adobe({ id: ['foo', 'bar'] })
```

It is recommended to load these IDs as environment variables.

### Bunny

A provider for [Bunny Fonts](https://fonts.bunny.net/).

```js
import { providers } from 'unifont'

providers.bunny()
```

### Fontshare

A provider for [Fontshare](https://www.fontshare.com/).

```js
import { providers } from 'unifont'

providers.fontshare()
```

### Fontsource

A provider for [Fontsource](https://fontsource.org/)'s API.

```js
import { providers } from 'unifont'

providers.fontsource()
```

### Google

A provider for [Google Fonts](https://fonts.google.com/).

```js
import { providers } from 'unifont'

providers.google()
```

#### Options

##### `experimental.variableAxis`

- Type: `{ [fontFamily: string]: Partial<Record<VariableAxis, ([string, string] | string)[]>> }`

Allows setting variable axis configuration on a per-font basis:

```js
import { providers } from 'unifont'

providers.google({
  experimental: {
    variableAxis: {
      Poppins: {
        slnt: [['-15', '0']],
        CASL: [['0', '1']],
        CRSV: ['1'],
        MONO: [['0', '1']],
      },
    },
  },
})
```

Overriden by the `experimental.variableAxis` family option.

##### `experimental.glyphs`

- Type: `{ [fontFamily: string]: string[] }`

Allows specifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { providers } from 'unifont'

providers.google({
  experimental: {
    glyphs: {
      Poppins: ['Hello', 'World']
    },
  },
})
```

Overriden by the `experimental.glyphs` family option.

#### Family options

##### `experimental.variableAxis`

- Type: `Partial<Record<VariableAxis, ([string, string] | string)[]>>`

Allows setting variable axis configuration on a per-font basis:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  options: {
    google: {
      experimental: {
        variableAxis: {
          slnt: [['-15', '0']],
          CASL: [['0', '1']],
          CRSV: ['1'],
          MONO: [['0', '1']],
        },
      },
    },
  },
})
```

##### `experimental.glyphs`

- Type: `string[]`

Allows specifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  options: {
    google: {
      experimental: {
        glyphs: ['Hello', 'World'],
      },
    },
  },
})
```

### Google icons

A provider for [Google Icons](https://fonts.google.com/icons).

```js
import { providers } from 'unifont'

providers.googleicons()
```

#### Options

##### `experimental.glyphs`

- Type: `{ [fontFamily: string]: string[] }`

Allows specifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { providers } from 'unifont'

providers.googleicons({
  experimental: {
    glyphs: {
      'Material Symbols Outlined': ['arrow_right', 'favorite', 'arrow_drop_down']
    },
  },
})
```

Only available when resolving the new `Material Symbols` icons. Overriden by the `experimental.glyphs` family option.

#### Family options

##### `experimental.glyphs`

- Type: `string[]`

Allows specifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.googleicons(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  options: {
    googleicons: {
      experimental: {
        'Material Symbols Outlined': ['arrow_right', 'favorite', 'arrow_drop_down']
      },
    },
  },
})
```

Only available when resolving the new `Material Symbols` icons.

### npm

A provider for npm packages, either from locally installed packages in `node_modules` or from a CDN.

```js
import { providers } from 'unifont'

providers.npm()
```

The provider automatically detects fonts from your `package.json` dependencies and can resolve fonts from packages like `@fontsource/*`, `@fontsource-variable/*`, and other known font packages.

#### Options

##### `cdn`

- Type: `string`
- Default: `'https://cdn.jsdelivr.net/npm'`

CDN to use for fetching npm packages remotely:

```js
import { providers } from 'unifont'

providers.npm({ cdn: 'https://esm.sh' })
```

##### `remote`

- Type: `boolean`
- Default: `true`

Whether to fall back to fetching from the CDN when local resolution fails. Set to `false` to only resolve from locally installed packages, in which case font sources are emitted as `file://` URLs pointing into `node_modules` and no CDN request is made:

```js
import { providers } from 'unifont'

providers.npm({ remote: true })
```

##### `readFile`

- Type: `(path: string) => Promise<string | null>`

Optional function to read a file from the local filesystem. When provided, the provider will try to resolve fonts from locally installed packages in `node_modules` before falling back to the CDN (unless `remote` is set to `false`):

```js
import { readFile } from 'node:fs/promises'
import { providers } from 'unifont'

providers.npm({
  readFile: path => readFile(path, 'utf-8').catch(() => null),
  remote: false,
})
```

##### `exists`

- Type: `(path: string) => Promise<boolean>`

Optional function to check whether a file exists. It is used when resolving font files with `remote: false`. When it is not provided, `readFile` is used for the check instead, which reads and decodes each candidate font file in full:

```js
import { access, readFile } from 'node:fs/promises'
import { providers } from 'unifont'

providers.npm({
  readFile: path => readFile(path, 'utf-8').catch(() => null),
  exists: path => access(path).then(() => true).catch(() => false),
  remote: false,
})
```

##### `resolve`

- Type: `(id: string) => string | null | Promise<string | null>`
- Default: `import.meta.resolve`, falling back to `<root>/node_modules/<id>`

Resolve a package-relative specifier (such as `@fontsource/roboto/index.css`) to an absolute path on disk. Return `null` (or throw) when the package isn't installed; the provider treats that as "not available locally" and falls back to the CDN unless `remote` is `false`.

Supply a resolver for layouts where the package isn't linked into a `node_modules` directory under `root`: pnpm's isolated store, hoisting to a monorepo root, Yarn PnP, or a bundler alias.

```js
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { providers } from 'unifont'

providers.npm({
  readFile: path => readFile(path, 'utf-8').catch(() => null),
  resolve: id => fileURLToPath(import.meta.resolve(id)),
})
```

##### `root`

- Type: `string`
- Default: `'.'`

Root directory of the project, used to find `package.json`, and `node_modules` when no `resolve` function is provided:

```js
import { providers } from 'unifont'

providers.npm({ root: './src' })
```

#### Family options

##### `package`

- Type: `string`
- Default: Auto-detected or inferred from family name

The npm package name. When not specified, the provider will try to find the font family in known font package patterns or infer based on Fontsource conventions:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.npm(),
])

const { fonts } = await unifont.resolveFont('Roboto', {
  options: {
    npm: {
      package: '@fontsource/roboto'
    },
  },
})
```

##### `version`

- Type: `string`
- Default: `'latest'`

The version of the package (used for CDN resolution only):

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.npm(),
])

const { fonts } = await unifont.resolveFont('Roboto', {
  options: {
    npm: {
      version: '5.0.0'
    },
  },
})
```

##### `file`

- Type: `string`
- Default: per-weight/per-style entry points, falling back to `'index.css'`

The entry CSS file to parse from the package. When not set, `@fontsource/*` packages are resolved through their per-weight and per-style entry points (`<weight>.css`, `<weight>-italic.css`) for the requested weights and styles:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.npm(),
])

const { fonts } = await unifont.resolveFont('Roboto', {
  options: {
    npm: {
      file: 'latin.css'
    },
  },
})
```

## `Unifont`

Use `createUnifont()` to create a `Unifont` instance. It requires an array of font providers at this first parameter:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])
```

### Options

`createUnifont()` accepts options as its 2nd parameter.

#### `storage`

- `Type`: `Storage`

Allows caching the results of font APIs to avoid unnecessary hits to them. Uses a memory cache by default.

This storage type is compatible with [`unstorage`](https://unstorage.unjs.io.):

```ts
import { createUnifont, providers } from 'unifont'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'

const storage = createStorage({
  driver: fsDriver({ base: 'node_modules/.cache/unifont' }),
})

const unifont = await createUnifont([
  providers.google()
], { storage })

// cached data is stored in `node_modules/.cache/unifont`
await unifont.resolveFont('Poppins')
```

#### `throwOnError`

- Type: `boolean`

Allows throwing on error if a font provider:

- Fails to initialize
- Fails while calling `resolveFont()`
- Fails while calling `listFonts()`
- Fails while calling `getFontProperties()`

If set to `false` (default), an error will be logged to the console instead:

```ts
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google()
], { throwOnError: true })
```

### Methods

#### `resolveFont()`

- Type: `(fontFamily: string, options?: Partial<ResolveFontOptions>, providers?: T[]) => Promise<ResolveFontResult & { provider?: T }>`

Retrieves font face data and fallbacks from available providers:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontsource(),
])

const { fonts, fallbacks } = await unifont.resolveFont('Poppins')
```

It loops through all providers and returns the result of the first provider that can return some data.

Fallbacks, if returned, contain the name of a [generic font family](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-family#generic-name). That can be useful, for example, to generate optimized fallbacks using font metrics.

##### Options

It accepts options as the 2nd parameter. Each provider chooses to support them or not.

###### `weights`

- Type: `string[]`
- Default: `['400']`

Specifies what weights to retrieve. Variable weights must me in the format `<min> <max>`:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  weights: ['300', '500 900']
})
```

If the family has no variable font covering the requested range, the range resolves to representative static weights: the available weights at each end of the range, plus the one nearest to `400` so that default-weight text still matches sensibly. So `500 900` resolves to two faces rather than every published weight in between. If no available weight falls inside the range at all (say `450 480` when only `400` and `500` are published), the closest available weight is used instead. List the weights explicitly if you need the intermediate ones.

###### `styles`

- Type: `('normal' | 'italic' | 'oblique')[]`
- Default: `['normal', 'italic']`

Specifies what styles to retrieve:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  styles: ['normal']
})
```

###### `subsets`

- Type: `string[]`
- Default: `['cyrillic-ext', 'cyrillic', 'greek-ext', 'greek', 'vietnamese', 'latin-ext', 'latin']`

Specifies what subsets to retrieve:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  subsets: ['latin']
})
```

###### `options`

- Type: `{ [key: string]?: Record<string, any> }`

A provider can define options to provide on a font family basis. Types will be automatically inferred:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  options: {
    google: {
      experimental: {
        glyphs: ['Hello', 'World']
      }
    }
  },
})
```

###### `formats`

- Type: `('woff2' | 'woff' | 'otf' | 'ttf' | 'eot')[]`
- Default: `['woff2']`

Specifies what font formats to retrieve:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const { fonts } = await unifont.resolveFont('Poppins', {
  formats: ['woff2', 'woff2']
})
```

##### Providers

- Type: `string[]`

By default it uses all the providers provided to `createUnifont()`. However you can restrict usage to only a subset:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontsource(),
])

const { fonts } = await unifont.resolveFont('Poppins', {}, ['google'])
```

#### `listFonts()`

- Type: `(providers?: T[]) => Promise<string[] | undefined>`

Retrieves font names available for all providers:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const availableFonts = await unifont.listFont()
```

It may return `undefined` if no provider is able to return names.

##### Providers

- Type: `string[]`

By default it uses all the providers provided to `createUnifont()`. However you can restrict usage to only a subset:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontsource(),
])

const availableFonts = await unifont.listFont(['google'])
```

#### `getFontProperties()`

- Type: `(fontFamily: string, providers?: T[number]['_name'][]) => Promise<(FontProperties & { provider?: T[number]['_name'] }) | undefined>`

Retrieves the properties (weights, styles, subsets and formats) available for the specified font family:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const properties = await unifont.getFontProperties('Roboto')
```

It loops through all providers and returns the result of the first provider that knows the family, along with a `provider` key identifying it.

A few things to keep in mind when consuming the result:

- `weights` mixes discrete values (`'400'`) and variable ranges expressed as `'<min> <max>'` (`'100 900'`).
- A missing field (e.g. `subsets`) means the provider does not expose that information, not that nothing is available.
- `formats` reflects what the provider can serve in general, not per-family availability, so a given format may still be unavailable for a specific family.
- A top-level `undefined` means no queried provider knows the family.

##### Providers

- Type: `string[]`

By default it uses all the providers provided to `createUnifont()`. However you can restrict usage to only a subset:

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
  providers.fontsource(),
])

const properties = await unifont.getFontProperties('Roboto', ['google'])
```

## Building your own provider

### Defining a provider

To build your own font provider, use the `defineFontProvider()` helper:

```ts
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider(/* ... */)
```

It accepts a unique name as a first argument and a callback function as 2nd argument:

```ts
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  // ...
})
```

If you use options, you can simply annotate it:

```ts
import { defineFontProvider } from 'unifont'

export interface MyProviderOptions {
  foo?: string
}

export const myProvider = defineFontProvider('my-provider', async (options: MyProviderOptions, ctx) => {
  // ...
})
```

The context (`ctx`) gives access to the [`storage`](#storage), allowing you to cache results, and to `ctx.fetch`, which retries transient failures and honours [`apiBase`](#using-providers-in-the-browser). We'll see how below.

### Initialization

The callback runs when a `Unifont` instance is created. It is used for initialization logic, such as fetching the list of available fonts:

```ts
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  const fonts: { name: string, cssUrl: string }[] = await ctx.storage.getItem('my-provider:meta.json', () => ctx.fetch('https://api.example.com/fonts.json').then(res => res.json()))

  // ...
})
```

You can now use this data in the methods.

### `listFonts()`

While optional, it's easy to implement this method now that we have the full list:

```ts
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  const fonts: { name: string, cssUrl: string }[] = [/* ... */]

  return {
    listFonts() {
      return fonts.map(font => font.name)
    }
    // ...
  }
})
```

### `getFontProperties()`

While optional, it's usually easy to implement this method as it shares logic with `resolveFont()`. Return `undefined` when the family is unknown, so unifont moves on to the next provider:

```ts
import type { FontProperties } from 'unifont'
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  const fonts: { name: string, properties: FontProperties }[] = [/* ... */]

  return {
    getFontProperties(fontFamily) {
      const font = fonts.find(font => font.name === fontFamily)
      if (!font) {
        return undefined
      }
      return font.properties
    }
    // ...
  }
})
```

### `resolveFont()`

This is where most of the logic lies. It depends a lot on how the provider works, and often involves parsing CSS files. Have a look at the implementation of built-in providers for inspiration!

```ts
import { hash } from 'ohash'
import { defineFontProvider } from 'unifont'

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  const fonts: { name: string, cssUrl: string }[] = [/* ... */]

  return {
    // ...
    async resolveFont(fontFamily, options) {
      const font = fonts.find(font => font.name === fontFamily)
      if (!font) {
        return
      }

      return {
        fonts: await ctx.storage.getItem(`my-provider:${fontFamily}-${hash(options)}-data.json`, async () => {
          // Fetch an API, extract CSS...
          return [/* ... */]
        })
      }
    }
  }
})
```

If you use family options, you can override the type of `options` and it will be inferred:

```ts
import type { ResolveFontOptions } from 'unifont'
import { hash } from 'ohash'
import { defineFontProvider } from 'unifont'

export interface MyProviderFamilyOptions {
  foo?: string
}

export const myProvider = defineFontProvider('my-provider', async (options, ctx) => {
  // ...

  return {
    // ...
    async resolveFont(fontFamily, options: ResolveFontOptions<MyProviderFamilyOptions>) {
      // ...
    }
  }
})
```

## Website

The site in [`docs/`](./docs) is a Nuxt app. It needs `unifont` built first, because the workspace links the
package from the repository root:

```bash
pnpm build
pnpm docs
```

Content lives in [`docs/content`](./docs/content) as Markdown, served through
[Comark Content](https://content.comark.dev). Everything else is generated from `unifont` at request time.

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

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
