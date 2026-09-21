/**
 * The endpoints that answer with a stylesheet, as a pattern the server middleware and Vercel's
 * routing layer can both read. Two of them are prerendered, so only the routing layer sees a
 * request for those at all.
 */
export const STYLESHEET_PATH = '^/api/v1/(?:css|catalogue\\.css|specimens\\.css|fonts/[^/]+/css)$'

/**
 * A `<link rel="stylesheet">` in a document we do not serve. A script or a `curl` sends neither
 * header, and this site's own pages are `same-origin`, so both are left alone.
 */
export function isCrossSiteStylesheet(headers: { site?: string | null, dest?: string | null }) {
  return headers.site === 'cross-site' && headers.dest === 'style'
}

/** Served as the body of a refusal, where the reader is a person rather than a parser. */
export const HOTLINK_NOTICE = '/* unifont.dev serves this stylesheet to its own pages and to scripts, not to other sites. Resolve the family with `unifont` and serve the CSS yourself: https://unifont.dev/docs */\n'
