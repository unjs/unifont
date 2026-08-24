/**
 * MicroLighter paints code with the CSS Custom Highlight API, adding no markup to the DOM. Where
 * the API is missing the code renders unhighlighted, so there is no fallback path.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!('highlights' in CSS)) {
    return
  }

  let queued = false

  async function paint() {
    if (queued) {
      return
    }
    queued = true
    await nextTick()
    queued = false
    const { highlightAll } = await import('microlighter')
    await highlightAll()
  }

  nuxtApp.hook('app:suspense:resolve', paint)
  nuxtApp.hook('page:finish', paint)

  return {
    provide: {
      highlightCode: paint,
    },
  }
})
