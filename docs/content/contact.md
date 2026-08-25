---
title: Contact
description: How to report a bug, ask a question, or reach the maintainers of unifont.
---

`unifont` is maintained on GitHub, so that is the fastest way to reach anyone who can help. Everything happens at [github.com/unjs/unifont](https://github.com/unjs/unifont), where you can see what's already been asked and answered.

## Report a bug

Open an issue at [github.com/unjs/unifont/issues](https://github.com/unjs/unifont/issues). A useful report names the provider, the family, the options you passed, and what you expected instead. If a family resolves differently from what a provider's own site shows, include the provider name: metadata differs between CDNs more often than people expect, and the [comparison view](/compare) will usually show it.

If the problem is with this site rather than the library, say so in the issue. The site lives in the `docs/` directory of the same repository, and the CORS proxy in `proxy/`.

## Ask a question

Questions about how to resolve a family, cache the results, or write your own provider are welcome as [GitHub discussions or issues](https://github.com/unjs/unifont/issues). Check the [documentation](/docs) first: installing, [resolving fonts](/docs/resolving), [providers](/docs/providers), [caching](/docs/caching) and [writing a custom provider](/docs/custom-providers) each have a page.

For questions about a font's licence, its glyph set, or its price, contact the foundry that made it. We only read what the CDNs publish and can't speak for the type designers whose work they distribute.

## Security

If you've found a security problem in `unifont`, in this site, or in the hosted proxy, please report it privately through [GitHub security advisories](https://github.com/unjs/unifont/security/advisories) rather than opening a public issue, and we'll take a look.

## Contribute

Pull requests are welcome, including new providers. Read [writing a custom provider](/docs/custom-providers) first: a provider is a small adapter, and adding one to the library is mostly a matter of tests. The project has a [code of conduct](https://github.com/unjs/unifont/blob/main/CODE_OF_CONDUCT.md).

## Maintainers

`unifont` is maintained by [Daniel Roe](https://roe.dev), with [qwerzl](https://github.com/qwerzl) and [florian-lefebvre](https://florian-lefebvre.dev).
