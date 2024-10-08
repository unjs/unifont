import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn } from '../utils'

describe('fontsource', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.fontsource()])
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont('Roboto Mono', { weights: ['1100'] }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont('Roboto Mono')

    expect(fonts).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/cyrillic-ext-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0460-052F",
            "U+1C80-1C88",
            "U+20B4",
            "U+2DE0-2DFF",
            "U+A640-A69F",
            "U+FE2E-FE2F",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0460-052F",
            "U+1C80-1C88",
            "U+20B4",
            "U+2DE0-2DFF",
            "U+A640-A69F",
            "U+FE2E-FE2F",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/cyrillic-ext-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0460-052F",
            "U+1C80-1C88",
            "U+20B4",
            "U+2DE0-2DFF",
            "U+A640-A69F",
            "U+FE2E-FE2F",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-ext-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0460-052F",
            "U+1C80-1C88",
            "U+20B4",
            "U+2DE0-2DFF",
            "U+A640-A69F",
            "U+FE2E-FE2F",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/cyrillic-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0301",
            "U+0400-045F",
            "U+0490-0491",
            "U+04B0-04B1",
            "U+2116",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0301",
            "U+0400-045F",
            "U+0490-0491",
            "U+04B0-04B1",
            "U+2116",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/cyrillic-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0301",
            "U+0400-045F",
            "U+0490-0491",
            "U+04B0-04B1",
            "U+2116",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/cyrillic-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0301",
            "U+0400-045F",
            "U+0490-0491",
            "U+04B0-04B1",
            "U+2116",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/greek-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0370-0377",
            "U+037A-037F",
            "U+0384-038A",
            "U+038C",
            "U+038E-03A1",
            "U+03A3-03FF",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0370-0377",
            "U+037A-037F",
            "U+0384-038A",
            "U+038C",
            "U+038E-03A1",
            "U+03A3-03FF",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/greek-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0370-0377",
            "U+037A-037F",
            "U+0384-038A",
            "U+038C",
            "U+038E-03A1",
            "U+03A3-03FF",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/greek-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0370-0377",
            "U+037A-037F",
            "U+0384-038A",
            "U+038C",
            "U+038E-03A1",
            "U+03A3-03FF",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/vietnamese-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0102-0103",
            "U+0110-0111",
            "U+0128-0129",
            "U+0168-0169",
            "U+01A0-01A1",
            "U+01AF-01B0",
            "U+0300-0301",
            "U+0303-0304",
            "U+0308-0309",
            "U+0323",
            "U+0329",
            "U+1EA0-1EF9",
            "U+20AB",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0102-0103",
            "U+0110-0111",
            "U+0128-0129",
            "U+0168-0169",
            "U+01A0-01A1",
            "U+01AF-01B0",
            "U+0300-0301",
            "U+0303-0304",
            "U+0308-0309",
            "U+0323",
            "U+0329",
            "U+1EA0-1EF9",
            "U+20AB",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/vietnamese-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0102-0103",
            "U+0110-0111",
            "U+0128-0129",
            "U+0168-0169",
            "U+01A0-01A1",
            "U+01AF-01B0",
            "U+0300-0301",
            "U+0303-0304",
            "U+0308-0309",
            "U+0323",
            "U+0329",
            "U+1EA0-1EF9",
            "U+20AB",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/vietnamese-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0102-0103",
            "U+0110-0111",
            "U+0128-0129",
            "U+0168-0169",
            "U+01A0-01A1",
            "U+01AF-01B0",
            "U+0300-0301",
            "U+0303-0304",
            "U+0308-0309",
            "U+0323",
            "U+0329",
            "U+1EA0-1EF9",
            "U+20AB",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-ext-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0100-02AF",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+1E00-1E9F",
            "U+1EF2-1EFF",
            "U+2020",
            "U+20A0-20AB",
            "U+20AD-20C0",
            "U+2113",
            "U+2C60-2C7F",
            "U+A720-A7FF",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0100-02AF",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+1E00-1E9F",
            "U+1EF2-1EFF",
            "U+2020",
            "U+20A0-20AB",
            "U+20AD-20C0",
            "U+2113",
            "U+2C60-2C7F",
            "U+A720-A7FF",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-ext-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0100-02AF",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+1E00-1E9F",
            "U+1EF2-1EFF",
            "U+2020",
            "U+20A0-20AB",
            "U+20AD-20C0",
            "U+2113",
            "U+2C60-2C7F",
            "U+A720-A7FF",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-ext-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0100-02AF",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+1E00-1E9F",
            "U+1EF2-1EFF",
            "U+2020",
            "U+20A0-20AB",
            "U+20AD-20C0",
            "U+2113",
            "U+2C60-2C7F",
            "U+A720-A7FF",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": "400",
        },
      ]
    `)
  })

  it('handles default subsets', async () => {
    const unifont = await createUnifont([providers.fontsource()])
    const { fonts } = await unifont.resolveFont('Roboto Mono', { subsets: undefined })
    expect(fonts).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-wght-normal.woff2",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.ttf",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": "400",
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono:vf@latest/latin-wght-italic.woff2",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.woff2",
            },
            {
              "format": "woff",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.woff",
            },
            {
              "format": "ttf",
              "url": "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-italic.ttf",
            },
          ],
          "style": "italic",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": "400",
        },
      ]
    `)
  })

  it('should handle failure to fetch', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const restoreFetch = mockFetchReturn(/variable/, () => {
      throw new Error('Failed to fetch')
    })

    const unifont = await createUnifont([providers.fontsource()])
    await unifont.resolveFont('Roboto Mono')

    expect(error).toHaveBeenCalledWith('Could not download variable axes metadata for `Roboto Mono` from `fontsource`. `unifont` will not be able to inject variable axes for Roboto Mono.')

    error.mockRestore()
    restoreFetch()
  })
})
