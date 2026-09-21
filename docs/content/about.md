---
title: About unifont
description: What unifont is, who maintains it, and what this site is for.
---

`unifont` is an open-source JavaScript library for reading font metadata from font CDNs.

Google Fonts returns a stylesheet you have to parse. Fontshare returns JSON, with its own names for weights. Fontsource publishes to npm. And Adobe needs a Typekit project id.

`unifont` puts one interface over all of them: ask for a family and you'll get weights, styles, subsets, unicode ranges and `@font-face` data back in the same shape, whichever provider answered.

It's deliberately small. It reads metadata and hands it to you. It doesn't download font files, subset them, generate a build pipeline, or cache anything on your behalf.

## Who makes it

`unifont` is maintained by [Daniel Roe](https://roe.dev), with [qwerzl](https://github.com/qwerzl) and [florian-lefebvre](https://florian-lefebvre.dev), at [github.com/unjs/unifont](https://github.com/unjs/unifont). It's published to npm as [`unifont`](https://www.npmjs.com/package/unifont) under the MIT licence, and there's no company behind it and nothing to sign up for.

It's used by [`@nuxt/fonts`](https://fonts.nuxt.com) and [`fontless`](https://github.com/unjs/fontaine/tree/main/packages/fontless), which wrap it to download, self-host and metric-match fonts automatically in Nuxt and Vite apps. If you want fonts to work on a site rather than to query font metadata yourself, those are the better starting point: [Reducing layout shift](/docs/layout-shift) shows how to set one up.

## What this site is

unifont.dev is the project site, and it's powered end to end by the library it documents. The catalogue is `listFonts()`, each family page is `getFontProperties()` and `resolveFont()`, and every face on the site was resolved at build time.

Every page here is also an HTTP endpoint. The [catalogue](/fonts), the [provider comparison](/compare) and each family page are thin layers over the [public API](/api), which needs no authentication. There's an MCP server at `/mcp` for agents, an [OpenAPI description](/openapi.json) of every endpoint, and a [machine-readable index](/llms.txt) of the site. Ask any prose page for `text/markdown`, or append `.md` to its path, and it answers in markdown.

## Font data and licensing

Font metadata and font files belong to the foundries that made them and are licensed by them, not by us. This site never proxies or re-hosts font binaries: every file URL in a response points at the provider's own CDN. Check a family's licence with its foundry before shipping it.

The public API is best-effort infrastructure for scripts, editor plugins and CI checks. It may be rate-limited or withdrawn, so if a deployment of yours depends on font resolution, install `unifont` and run it yourself, or [self-host the CORS proxy](/docs/proxy).

## Stacks live in your account

A stack you publish is a `dev.unifont.stack` record written to your own atproto account, through OAuth against your own server. This site never holds it: it reads records back from the accounts that own them, and finds them through [constellation](https://constellation.microcosm.blue), a public index of links between records. Delete the record anywhere that speaks atproto and it is gone from here too, because there was never a second copy.

The write happens in your browser, against your own server, so there is no session here to keep: the only thing this site publishes about it is the [client metadata document](/oauth-client-metadata.json) your server reads to identify the app.
