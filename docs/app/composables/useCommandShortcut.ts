/**
 * The keyboard hint for the palette: `⌘K` on Apple platforms, `Ctrl+K` everywhere else.
 *
 * The server guesses from the request headers and the client corrects it in `onMounted`, after
 * hydration has compared the trees, so a wrong guess costs a text swap rather than a mismatch.
 */
export function useCommandShortcut() {
  const label = useState('command-shortcut', () => {
    if (import.meta.client) {
      return hint(navigator.userAgent)
    }
    const headers = useRequestHeaders(['sec-ch-ua-platform', 'user-agent'])
    const platform = headers['sec-ch-ua-platform']
    if (platform) {
      return /macos/i.test(platform) ? '⌘K' : 'Ctrl+K'
    }
    return hint(headers['user-agent'] ?? '')
  })

  onMounted(() => {
    label.value = hint(navigator.userAgent)
  })

  return label
}

/** iPadOS reports itself as a Mac, and both take ⌘. */
function hint(source: string) {
  return /mac|iphone|ipad|ipod/i.test(source) ? '⌘K' : 'Ctrl+K'
}
