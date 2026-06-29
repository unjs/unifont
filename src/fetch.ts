const RETRY_DELAY = 1000

class NonRetryableError extends Error {}

export async function fetchWithRetries(url: string, init?: RequestInit, retries: number = 3): Promise<Response> {
  try {
    const response = await fetch(url, init)
    if (!response.ok) {
      const message = `Fetch error (status ${response.status}): ${response.statusText}`
      // Client errors (4xx) are deterministic and won't succeed on retry, except
      // for 429 (Too Many Requests) which is transient.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new NonRetryableError(message)
      }
      throw new Error(message)
    }
    return response
  }
  catch (err) {
    if (retries <= 0 || err instanceof NonRetryableError) {
      throw err
    }
    console.warn(`Could not fetch from \`${url}\`. Will retry in \`${RETRY_DELAY}ms\`. \`${retries}\` retries left.`)
    return new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      .then(() => fetchWithRetries(url, init, retries - 1))
  }
}
