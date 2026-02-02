import { describe, expect, it } from 'vitest'
import { createUnifont, defineFontProvider } from '../../src'

const init = { headers: { Authorization: 'Bearer password1234' } }
/** Dummy custom provider for testing purposes. */
const customProvider = defineFontProvider('custom', async () => {
  return {
    async resolveFont(family) {
      return { fonts: [
        {
          src: [{ url: `https://example.com/${encodeURIComponent(family)}` }],
          meta: { init },
        },
      ] }
    },
  }
})

describe('custom provider', () => {
  it('works', async () => {
    const unifont = await createUnifont([customProvider()])
    expect(await unifont.resolveFont({ fontFamily: 'Test Font', provider: 'custom' }).then(r => r.fonts)).toMatchInlineSnapshot(`
      [
        {
          "meta": {
            "init": {
              "headers": {
                "Authorization": "Bearer password1234",
              },
            },
          },
          "src": [
            {
              "url": "https://example.com/Test%20Font",
            },
          ],
        },
      ]
    `)
  })

  it('includes an init object if set by the provider', async () => {
    const unifont = await createUnifont([customProvider()])
    expect(await unifont.resolveFont({ fontFamily: 'Test Font', provider: 'custom' }).then(r => r.fonts.pop()?.meta?.init)).toMatchObject(init)
  })
})
