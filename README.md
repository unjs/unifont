# unifont

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

Framework agnostic tools for accessing data from font CDNs and providers.

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
const { fonts } = await unifont.resolveFont('Poppins')
```

## Built-in providers

The following providers are built-in but you can build [custom providers](#building-your-own-provider) too.

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

A provider for [Fontsource](https://fontsource.org/).

```js
import { providers } from 'unifont'

providers.fontsource()
```

It uses the API, not installed NPM packages (see [PR #189](https://github.com/unjs/unifont/pull/189)).

### Google

A provider for [Google Fonts](https://fonts.google.com/).

```js
import { providers } from 'unifont'

providers.google()
```

#### Options

##### `experimental.variableAxis`

- Type: `{ [key: string]: Partial<Record<VariableAxis, ([string, string] | string)[]>> }`

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

##### `experimental.glyphs`

- Type: `{ [fontFamily: string]: string[] }`

Allows pecifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { providers } from 'unifont'

providers.google({
  experimental: {
    variableAxis: {
      Poppins: ['Hello', 'World']
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

Allows pecifying a list of glyphs to be included in the font for each font family. This can reduce the size of the font file:

```js
import { providers } from 'unifont'

providers.googleicons({
  experimental: {
    variableAxis: {
      Poppins: ['Hello', 'World']
    },
  },
})
```

Only available when resolving the new `Material Symbols` icons.

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

If set to `false` (default), an error will be logged to the console instead:

```ts
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google()
], { throwOnError: true })
```

### Methods

#### `listFonts()`

TODO:

#### `resolveFont()`

TODO:

## Building your own provider

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unifont?style=flat-square
[npm-version-href]: https://npmjs.com/package/unifont
[npm-downloads-src]: https://img.shields.io/npm/dm/unifont?style=flat-square
[npm-downloads-href]: https://npm.chart.dev/unifont
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/unifont/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/unjs/unifont/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/unifont/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/unifont
