declare module 'microlighter' {
  export interface HighlightAllOptions {
    root?: Document | Element
    selector?: string
    languageAliases?: Record<string, string>
  }

  export function highlightAll(options?: HighlightAllOptions): Promise<Element[]>
}
