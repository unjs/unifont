import type { ContributorsResponse } from '#shared/types'
import { defineCachedHandler } from 'nitro/cache'

interface GitHubContributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
  type: string
}

/** Bots dominate the commit count. */
const BOTS = /\[bot\]$|^renovate$|^dependabot$/i

/**
 * Everyone who has landed a commit in `unjs/unifont`, ranked by commit count. Unauthenticated, so
 * GitHub allows 60 requests an hour per IP; a failure returns an empty list rather than an error.
 */
export default defineCachedHandler(async (): Promise<ContributorsResponse> => {
  try {
    const response = await fetch('https://api.github.com/repos/unjs/unifont/contributors?per_page=100', {
      headers: { accept: 'application/vnd.github+json' },
    })
    if (!response.ok) {
      return { contributors: [], unavailable: true }
    }

    const raw = await response.json() as GitHubContributor[]

    return {
      contributors: raw
        .filter(person => person.type === 'User' && !BOTS.test(person.login))
        .sort((a, b) => b.contributions - a.contributions)
        .map(person => ({
          login: person.login,
          avatar: `${person.avatar_url}${person.avatar_url.includes('?') ? '&' : '?'}s=96`,
          url: person.html_url,
          contributions: person.contributions,
        })),
      unavailable: false,
    }
  }
  catch {
    return { contributors: [], unavailable: true }
  }
}, {
  maxAge: 60 * 60 * 24,
  name: 'contributors',
  getKey: () => 'unjs-unifont',
})
