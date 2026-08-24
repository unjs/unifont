import type { ShallowRef } from 'vue'

/**
 * Whether an element actually scrolls. A scroll container needs a tab stop only while it has
 * somewhere to scroll to, so an unconditional `tabindex="0"` would lead nowhere.
 */
export function useOverflow(target: Readonly<ShallowRef<HTMLElement | null>>) {
  const overflowing = ref(false)

  function measure() {
    const element = target.value
    if (!element) {
      overflowing.value = false
      return
    }
    overflowing.value = element.scrollWidth > element.clientWidth + 1
      || element.scrollHeight > element.clientHeight + 1
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    let child: Element | null = null

    function observeChild(element: HTMLElement | null) {
      const next = element?.firstElementChild ?? null
      if (next === child) {
        return
      }
      if (child) {
        observer.unobserve(child)
      }
      child = next
      // The container's own box does not change when its contents do, so watch the contents too.
      if (child) {
        observer.observe(child)
      }
    }

    const mutations = typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(() => {
          observeChild(target.value)
          measure()
        })

    watch(target, (element, previous) => {
      if (previous) {
        observer.unobserve(previous)
      }
      mutations?.disconnect()
      observeChild(element)
      if (element) {
        observer.observe(element)
        // Slot content can arrive or be replaced after mount, leaving the new child unobserved.
        mutations?.observe(element, { childList: true })
      }
    }, { immediate: true })

    onBeforeUnmount(() => {
      observer.disconnect()
      mutations?.disconnect()
    })
  })

  return { overflowing, measure }
}
