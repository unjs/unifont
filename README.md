# unifont

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> Framework agnostic tools for accessing data from font CDNs and providers

## Usage

Install package:

```sh
# npm
npm install unifont
```

```js
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([providers.google()])

const fonts = await unifont.resolveFont('Poppins')

console.log(fonts)

const availableFonts = await unifont.listFonts()

console.log(availableFonts)
```

In most environments, you will want to cache the results of font APIs to avoid unnecessary hits to them. By default `unifont` caches font data in memory.

For full control, `unifont` exposes a storage API which is compatible with `unstorage`. It simply needs to expose a `getItem` and `setItem` method.

```ts
import { createUnifont, providers } from 'unifont'

import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'

const storage = createStorage({
  driver: fsDriver({ base: 'node_modules/.cache/unifont' }),
})

const cachedUnifont = await createUnifont([providers.google()], { storage })

console.log(await cachedUnifont.resolveFont('Poppins'))

// cached data is stored in `node_modules/.cache/unifont`
```

For more about the storage drivers exposed from `unstorage`, check out https://unstorage.unjs.io.

### Using Local Fonts from NPM Packages

You can use fonts installed as NPM packages (like those from @fontsource) before falling back to remote sources:

```ts
import { createUnifont, providers } from 'unifont'

// First install the fonts you need
// npm install @fontsource/poppins @fontsource/roboto

// Include the npm provider and set preferLocal to true
const unifont = await createUnifont(
  [
    providers.npm(), // Will check for fonts in local packages first
    providers.google(), // Fallback to Google Fonts if not found locally
  ],
  {
    preferLocal: true, // Prioritize local npm packages
  }
)

// This will first check @fontsource/poppins in node_modules
// and only use Google Fonts if not found locally
const fonts = await unifont.resolveFont('Poppins')

console.log(fonts)
```

You can also provide custom options to the npm provider:

```ts
import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont(
  [
    providers.npm({
      // Explicitly specify packages to look for
      packages: ['@fontsource/poppins', '@fontsource/roboto'],
      // Custom base directory if your node_modules is elsewhere
      baseDir: './custom/path/node_modules',
    }),
    providers.google(),
  ],
  {
    preferLocal: true,
  }
)
```

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
