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
    watch(target, (element, previous) => {
      if (previous) {
        observer.unobserve(previous)
        if (previous.firstElementChild) {
          observer.unobserve(previous.firstElementChild)
        }
      }
      if (element) {
        observer.observe(element)
        // The container's own box does not change when its contents do, so watch the contents too.
        if (element.firstElementChild) {
          observer.observe(element.firstElementChild)
        }
      }
    }, { immediate: true })
    onBeforeUnmount(() => observer.disconnect())
  })

  return { overflowing, measure }
}
