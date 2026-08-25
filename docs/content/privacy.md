---
title: Privacy
description: What unifont.dev collects, what it does not, and what leaves this site when you use it.
---

unifont.dev has no accounts, no sign-up, no newsletter and nothing to buy, so there's very little to say here. We don't want your data and we have nowhere to put it.

## No tracking, no cookies

This site sets no cookies, uses no local storage for identification, and ships no analytics, tag manager, advertising or session-recording script. There's nothing to consent to because nothing is being collected about you. The pages are static or server-rendered HTML with a small amount of JavaScript for search and the font tester, all served from the same origin.

## What the server sees

Like any web server, the host serving unifont.dev processes the requests it answers: the URL you asked for, the time, your IP address, your user agent and the referring page. These are the ordinary operational logs a hosting provider keeps to serve traffic, spot abuse and rate-limit it if necessary. They aren't joined to a profile, sold, shared with advertisers, or used to build any picture of you.

The public [HTTP API](/api) and the [MCP server](/mcp) work the same way. Requests need no key, so a request carries no identity beyond what your HTTP client sends. Query parameters, such as a family name or a string you pass to the coverage endpoint, appear in those logs; don't send anything confidential in a URL.

## Third parties

Font metadata is read from the CDNs (Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons, npm) server-side, from our server to theirs.

Font files are a different matter. This site never proxies or re-hosts them, so the `@font-face` rules behind the specimens on the catalogue, the family pages and the comparison view point at the provider's own CDN, and your browser fetches them from there. Loading those pages tells the provider (usually Google) your IP address and user agent, exactly as any site using their CDN would. The typefaces the interface itself is set in are self-hosted here, so they cost no third-party request; contributor avatars in the footer are served by GitHub.

## The hosted proxy

`unifont` running in a browser or a web container can't reach provider APIs directly, because they send no CORS headers, so it routes those requests through a proxy we host. The proxy forwards a provider request and returns the answer; it's described in the [self-hosting the proxy](/docs/proxy) documentation, and you can run your own if you'd rather no request of yours passed through ours.

## Your rights, and getting in touch

Because we hold no personal data beyond transient server logs, there's normally nothing to export or erase. If you believe otherwise, or you have a question about any of the above, open an issue or contact us as described on the [contact page](/contact). If this page changes, the change will be in the [public git history](https://github.com/unjs/unifont) of this site along with everything else.
