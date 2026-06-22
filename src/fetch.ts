const RETRY_DELAY = 1000

export async function fetchWithRetries(url: string, init?: RequestInit, retries: number = 3): Promise<Response> {
  try {
    const response = await fetch(url, init)
    if (!response.ok) {
      throw new Error(`Fetch error (status ${response.status}): ${response.statusText}`)
    }
    return response
  }
  catch (err) {
    if (retries <= 0) {
      throw err
    }
    console.warn(`Could not fetch from \`${url}\`. Will retry in \`${RETRY_DELAY}ms\`. \`${retries}\` retries left.`)
    return new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      .then(() => fetchWithRetries(url, init, retries - 1))
  }
}
