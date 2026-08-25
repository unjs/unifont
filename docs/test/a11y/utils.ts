import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { APIRequestContext, Page } from '@playwright/test'
import type { AxeResults, Result } from 'axe-core'

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

declare global {
  interface Window {
    axe: { run: (context: unknown, options: unknown) => Promise<AxeResults> }
  }
}

/**
 * The routes every check runs over: one per template, plus the error page. `:family` is replaced
 * with a family the live catalogue actually returns, so a change upstream cannot turn these into
 * 404 scans.
 */
export const ROUTES = [
  '/',
  '/fonts',
  '/fonts/:family',
  '/compare?family=:family',
  '/docs',
  '/docs/providers',
  '/api',
  '/about',
  '/not-a-page',
] as const

/** Only normative rules. Advisory `best-practice` rules are a separate, non-blocking run. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ADVISORY_TAGS = ['best-practice']

export const TAGS = process.env.A11Y_ADVISORY ? ADVISORY_TAGS : WCAG_TAGS

/*
 * Preferences rather than a hard-coded family: any of these exercises the same template, and if
 * the catalogue stops carrying one the scan falls back to whatever it does carry.
 */
const PREFERRED_FAMILIES = ['Newsreader', 'Inter', 'Roboto', 'Lato']

let cachedFamily: Promise<string> | undefined

async function search(request: APIRequestContext, query: string) {
  const response = await request.get(`/api/v1/fonts?limit=1&q=${encodeURIComponent(query)}`)
  const body = await response.json() as { families?: { family: string }[] }
  return body.families?.[0]?.family
}

/** A family the catalogue confirms it has, so no test depends on a name upstream may drop. */
export function catalogueFamily(request: APIRequestContext) {
  cachedFamily ??= (async () => {
    for (const candidate of PREFERRED_FAMILIES) {
      const match = await search(request, candidate)
      if (match?.toLowerCase() === candidate.toLowerCase()) {
        return match
      }
    }
    const fallback = await search(request, '')
    if (!fallback) {
      throw new Error('The catalogue returned no families, so there is nothing to scan.')
    }
    return fallback
  })()
  return cachedFamily
}

/** Elements that only exist while data is still in flight. */
const PENDING = '.coverage__pending, .block__placeholder'
const PENDING_TEXT = /measuring…|loading…|resolving…|Searching/

/**
 * Specimens, coverage rows and transfer figures all land after hydration, and each of them can
 * introduce a contrast or naming failure of its own, so the page has to be finished before it is
 * scanned. Waits on the placeholders those features render rather than on a fixed delay.
 */
export async function settle(page: Page, path: string) {
  const resolved = path.includes(':family')
    ? path.replace(':family', encodeURIComponent(await catalogueFamily(page.request)))
    : path

  await page.goto(resolved)
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    ([selector, text]) => !document.querySelector(selector!) && !new RegExp(text!).test(document.body.innerText),
    [PENDING, PENDING_TEXT.source] as const,
  )
  return resolved
}

/*
 * Rules axe ships disabled that carry a Success Criterion at this project's target level.
 * `label-content-name-mismatch` is SC 2.5.3: an accessible name that does not contain the visible
 * text, which breaks voice control. A default run passes that clean.
 */
const ENABLED = ['label-content-name-mismatch']

/** Runs axe over `context` (a selector, or the whole document) and returns the violations. */
export async function violations(page: Page, context: string | null = null): Promise<Result[]> {
  await page.addScriptTag({ content: axeSource })
  const results = await page.evaluate(
    ([target, tags, enabled]) =>
      window.axe.run(target ?? document, {
        resultTypes: ['violations'],
        runOnly: { type: 'tag', values: tags },
        rules: Object.fromEntries((enabled as string[]).map(rule => [rule, { enabled: true }])),
      }),
    [context, TAGS, ENABLED] as const,
  )
  return results.violations
}

/** A failure message that names the rule, the element and the reason, so a red run is actionable. */
export function describeViolations(results: Result[]) {
  return results
    .map((violation) => {
      const nodes = violation.nodes
        .map(node => `    ${node.target.join(' ')}\n      ${(node.failureSummary ?? '').split('\n').filter(Boolean).slice(1).join(' ')}`)
        .join('\n')
      return `  ${violation.id} (${violation.impact}) × ${violation.nodes.length} — ${violation.help}\n${nodes}`
    })
    .join('\n')
}
