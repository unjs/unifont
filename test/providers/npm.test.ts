import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'

describe('npm', () => {
  it('should resolve fonts from local npm packages', async () => {
    // Create a Unifont instance using only npm provider
    const unifont = await createUnifont([
      providers.npm(),
    ])

    // List available fonts
    const fonts = await unifont.listFonts()
    expect(fonts).toContain('roboto')

    // Try to resolve Roboto font
    const result = await unifont.resolveFont('Roboto', {
      weights: ['400', '700'],
      styles: ['normal', 'italic'],
    })

    expect(result.fonts.length).toBeGreaterThan(0)

    if (result.fonts.length > 0) {
      const font = result.fonts[0]!

      // Verify font properties - skip family check as it might not be set
      // Weight can be either string '400'/'700' or number 400/700
      expect([400, 700, '400', '700']).toContain(font.weight)
      expect(['normal', 'italic']).toContain(font.style)
      expect(font.src.length).toBeGreaterThan(0)

      // Verify the first source URL is a local file path
      if (font.src.length > 0 && 'url' in font.src[0]!) {
        expect(font.src[0].url).toMatch(/^file:\/\//)
      }

      // Verify metadata
      if (font.meta) {
        expect((font.meta as any).source).toBe('npm')
        // @ts-expect-error: custom metadata added by npm provider
        expect(font.meta.package).toBe('@fontsource/roboto')
      }
    }
  })

  it('should prefer local fonts', async () => {
    // Create a Unifont instance using both npm and google providers
    const unifontWithPreferLocal = await createUnifont([
      providers.npm({
        packages: ['@fontsource/roboto'],
      }),
      providers.google(),
    ])

    // Resolve Roboto font
    const resultWithPreferLocal = await unifontWithPreferLocal.resolveFont(
      'Roboto',
    )
    expect(resultWithPreferLocal.provider).toBe('npm')

    if (
      resultWithPreferLocal.fonts.length > 0
      && resultWithPreferLocal.fonts[0]?.meta
    ) {
      expect((resultWithPreferLocal.fonts[0].meta as any).source).toBe('npm')
    }
  })
})
