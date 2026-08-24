import type { Provider } from '../src'
import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../src'

// `adobe` needs a project id, and `npm` cannot enumerate the registry, so neither can be
// exercised without credentials or a guessed package name.
const cases: { provider: Provider, family: string }[] = [
  { provider: providers.google(), family: 'Newsreader' },
  { provider: providers.googleicons(), family: 'Material Symbols Outlined' },
  { provider: providers.bunny(), family: 'Poppins' },
  { provider: providers.fontsource(), family: 'Roboto' },
  { provider: providers.fontshare(), family: 'Satoshi' },
]

describe('getFontProperties round-trip', () => {
  for (const { provider, family } of cases) {
    it(`resolves the properties reported by ${provider._name}`, async () => {
      const unifont = await createUnifont([provider], { throwOnError: true })

      const properties = await unifont.getFontProperties(family)
      expect(properties).toBeDefined()

      const { fonts } = await unifont.resolveFont(family, properties!)
      expect(fonts.length).toBeGreaterThan(0)
    })
  }
})
