/**
 * Whether `server/plugins/specimen-faces.ts` has already inlined a sheet's faces, so a page can
 * link it only when they are absent. Nothing is inlined for a page reached client-side.
 *
 * @param href The sheet the tag holds, matching the plugin's own mapping.
 */
export function useInlinedSpecimens(href: string) {
  const tag = import.meta.client
    ? document.querySelector<HTMLStyleElement>(`style[data-specimen-faces="${href}"]`)
    : null

  // On the server the tag is still being written, so the plugin's rule is restated instead.
  const covered = ref(import.meta.server
    ? !Object.keys(useRoute().query).length
    : !!tag)

  /** Drops the inlined faces, for a page that has moved past the state they were drawn for. */
  function release() {
    if (covered.value) {
      covered.value = false
      tag?.remove()
    }
  }

  onBeforeUnmount(release)

  return { covered, release }
}
