/** Shared open/closed state for the ⌘K palette, which mounts once in the header. */
export function useCommandPalette() {
  const isOpen = useState('palette-open', () => false)
  const initialQuery = useState('palette-query', () => '')

  return {
    isOpen,
    initialQuery,
    open(query = '') {
      initialQuery.value = query
      isOpen.value = true
    },
    close() {
      isOpen.value = false
    },
  }
}
