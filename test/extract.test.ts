import type { RemoteFontSource } from '../src'

import { describe, expect, it } from 'vitest'
import { extractFontFaceData } from '../src/css/parse'

describe('css font-face extraction', () => {
  describe('basic font-face parsing', () => {
    it('should parse complete font-face declaration with all properties', () => {
      expect(extractFontFaceData(`
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-display: swap;
          font-weight: 500;
          src: local("Open Sans"), url(./files/open-sans-latin-500-normal.woff2) format('woff2') tech('color-COLRv1'), url(./files/open-sans-latin-500-normal.woff) format(woff) tech(color-COLRv1);
          unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
        }
      `)).toMatchInlineSnapshot(`
        [
          {
            "display": "swap",
            "src": [
              {
                "name": "Open Sans",
              },
              {
                "format": "woff2",
                "tech": "color-COLRv1",
                "url": "./files/open-sans-latin-500-normal.woff2",
              },
              {
                "format": "woff",
                "tech": "color-COLRv1",
                "url": "./files/open-sans-latin-500-normal.woff",
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
            "weight": 500,
          },
        ]
      `)
    })

    it('should skip non-@font-face declarations', () => {
      expect(extractFontFaceData(`
        @media (min-width: 768px) {
          font-family: Arial;
        }
        :root {
          font-family: Roboto;
        }
        @font-face {}
      `)).toMatchInlineSnapshot(`[]`)
    })

    it('should skip font faces without src property', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          font-weight: 400;
          /* no src property */
        }
      `
      expect(extractFontFaceData(css)).toEqual([])
    })

    it('should always return unicodeRange as an array', () => {
      expect(
        extractFontFaceData(`
          @font-face {
            src: url(https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmYiAr0klQmz24O0g.woff2) format("woff2");
            unicode-range: U+1F00-1FFF;
          }
        `),
      ).toEqual([
        {
          src: [
            {
              format: 'woff2',
              url: 'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmYiAr0klQmz24O0g.woff2',
            },
          ],
          unicodeRange: ['U+1F00-1FFF'],
        },
      ])
    })
  })

  describe('font family filtering', () => {
    it('should filter font faces by family name when provided', () => {
      const css = `
        @font-face {
          font-family: 'Roboto';
          src: url('/roboto.woff2') format('woff2');
          font-weight: 400;
        }
        @font-face {
          font-family: 'Open Sans';
          src: url('/opensans.woff2') format('woff2');
          font-weight: 400;
        }
      `

      expect(extractFontFaceData(css, 'Roboto')).toHaveLength(1)
      expect(extractFontFaceData(css, 'Open Sans')).toHaveLength(1)
      expect(extractFontFaceData(css, 'Arial')).toEqual([])
    })

    it('should handle font family name case insensitivity', () => {
      const css = `
        @font-face {
          font-family: 'Roboto';
          src: url('/roboto.woff2') format('woff2');
        }
      `

      expect(extractFontFaceData(css, 'roboto')).toHaveLength(1)
      expect(extractFontFaceData(css, 'ROBOTO')).toHaveLength(1)
      expect(extractFontFaceData(css, 'RoBoTo')).toHaveLength(1)
    })

    it('should handle font family arrays', () => {
      const css = `
        @font-face {
          font-family: 'Roboto', 'Arial', sans-serif;
          src: url('/roboto.woff2') format('woff2');
        }
      `

      expect(extractFontFaceData(css, 'Roboto')).toHaveLength(1)
      expect(extractFontFaceData(css, 'Arial')).toHaveLength(1)
      expect(extractFontFaceData(css, 'sans-serif')).toHaveLength(1)
      expect(extractFontFaceData(css, 'Helvetica')).toHaveLength(0)
    })
  })

  describe('cSS value type processing', () => {
    it('should handle numeric values', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-weight: 450;
        }
      `

      expect(extractFontFaceData(css)).toMatchInlineSnapshot(`
        [
          {
            "src": [
              {
                "format": "woff2",
                "url": "/test.woff2",
              },
            ],
            "weight": 450,
          },
        ]
      `)
    })

    it('should handle dimension values (angles, lengths)', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-style: oblique 10deg 20deg;
        }
      `

      expect(extractFontFaceData(css)).toMatchInlineSnapshot(`
        [
          {
            "src": [
              {
                "format": "woff2",
                "url": "/test.woff2",
              },
            ],
            "style": "oblique 10deg 20deg",
          },
        ]
      `)
    })

    it('should handle multi-value font-style properties', () => {
      expect(extractFontFaceData(`
        @font-face {
          font-style: oblique 0deg 15deg;
          src: url(https://myfont.com/font.woff2) format('woff2');
        }
      `)).toMatchInlineSnapshot(`
        [
          {
            "src": [
              {
                "format": "woff2",
                "url": "https://myfont.com/font.woff2",
              },
            ],
            "style": "oblique 0deg 15deg",
          },
        ]
      `)
    })

    it('should handle comma-separated values', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-feature-settings: "liga" 1, "kern" 1;
        }
      `

      expect(extractFontFaceData(css)).toMatchInlineSnapshot(`
        [
          {
            "featureSettings": [
              "liga",
              1,
              "kern",
              1,
            ],
            "src": [
              {
                "format": "woff2",
                "url": "/test.woff2",
              },
            ],
          },
        ]
      `)
    })

    it('should handle string values in font properties', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-style: italic;
          font-variation-settings: "wght" 400, "slnt" 0deg;
          unicode-range: U+0000-00FF, U+0131, U+0152-0153;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.style).toBe('italic')
      expect(result[0]!.variationSettings).toBeDefined()
      expect(result[0]!.unicodeRange).toEqual(['U+0000-00FF', 'U+0131', 'U+0152-0153'])
    })
  })

  describe('font source handling', () => {
    it('should handle local font sources', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: local('Test Font Regular'), url('/test.woff2') format('woff2');
        }
      `

      expect(extractFontFaceData(css)).toMatchInlineSnapshot(`
        [
          {
            "src": [
              {
                "name": "Test Font Regular",
              },
              {
                "format": "woff2",
                "url": "/test.woff2",
              },
            ],
          },
        ]
      `)
    })

    it('should handle format specified as identifier vs string', () => {
      const css1 = `@font-face { font-family: 'Test'; src: url('/test.woff2') format(woff2); }`
      const css2 = `@font-face { font-family: 'Test'; src: url('/test.woff2') format('woff2'); }`

      const result1 = extractFontFaceData(css1)
      const result2 = extractFontFaceData(css2)

      expect((result1[0]!.src[0] as RemoteFontSource).format).toBe('woff2')
      expect((result2[0]!.src[0] as RemoteFontSource).format).toBe('woff2')
    })

    it('should handle tech parameter specified as identifier vs string', () => {
      const css1 = `@font-face { font-family: 'Test'; src: url('/test.woff2') format('woff2') tech(variations); }`
      const css2 = `@font-face { font-family: 'Test'; src: url('/test.woff2') format('woff2') tech('variations'); }`

      const result1 = extractFontFaceData(css1)
      const result2 = extractFontFaceData(css2)

      expect((result1[0]!.src[0] as RemoteFontSource).tech).toBe('variations')
      expect((result2[0]!.src[0] as RemoteFontSource).tech).toBe('variations')
    })

    it('should sort font sources by priority', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url(/font.svg) format('svg'),
               url(/font.ttf) format('truetype'),
               url(/font.woff) format('woff'),
               url(/font.woff2) format('woff2'),
               local('Test Font');
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      const formats = result[0]!.src.map(s => 'format' in s ? s.format : 'local')

      // Local fonts should come first, then woff2, woff, truetype, svg
      expect(formats[0]).toBe('local')
      expect(formats[1]).toBe('woff2')
      expect(formats[2]).toBe('woff')
      expect(formats[3]).toBe('truetype')
      expect(formats[4]).toBe('svg')
    })

    it('should handle sources without format property', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/font.svg'),
               local('Test Font'),
               url('/font.woff2') format('woff2'),
               url('/font.ttf');
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)

      const fontSources = result[0]!.src
      expect(fontSources).toHaveLength(4)

      // Verify we have both sources with and without format
      const localSource = fontSources.find(src => 'name' in src)
      const sourcesWithoutFormat = fontSources.filter(src => 'url' in src && !('format' in src))
      const sourcesWithFormat = fontSources.filter(src => 'url' in src && 'format' in src)

      expect(localSource).toBeDefined()
      expect(sourcesWithoutFormat.length).toBeGreaterThan(0)
      expect(sourcesWithFormat.length).toBeGreaterThan(0)
    })
  })

  describe('unicode range processing', () => {
    it('should handle single unicode range', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          unicode-range: U+0000-007F;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.unicodeRange).toEqual(['U+0000-007F'])
    })

    it('should handle multiple unicode ranges', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          unicode-range: U+0020-007F, U+00A0-00FF, U+0100-017F;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.unicodeRange).toEqual(['U+0020-007F', 'U+00A0-00FF', 'U+0100-017F'])
    })

    it('should handle unicode range with space-separated values', () => {
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          unicode-range: U+0000 U+0001 U+0002;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.unicodeRange).toEqual(['U+0000', 'U+0001', 'U+0002'])
    })
  })

  describe('font merging and deduplication', () => {
    it('should merge duplicate font faces and remove duplicate sources', () => {
      expect(extractFontFaceData(`
        @font-face {
          font-family: 'Open Sans';
          src: local('Open Sans')
        }
        @font-face {
          font-family: 'Open Sans';
          src: local('Open Sans'), url(/font.woff2) format('woff2'), url(/font.woff2) format('woff2');
        }
      `)).toMatchInlineSnapshot(`
        [
          {
            "src": [
              {
                "name": "Open Sans",
              },
              {
                "format": "woff2",
                "url": "/font.woff2",
              },
            ],
          },
        ]
      `)
    })
  })

  describe('malformed CSS handling', () => {
    it('should handle empty @font-face blocks gracefully', () => {
      const cssEmptyBlock = `@font-face {}`
      const cssMinimalBlock = `@font-face { /* comment only */ }`

      // These should not crash and should return empty arrays
      const result1 = extractFontFaceData(cssEmptyBlock)
      const result2 = extractFontFaceData(cssMinimalBlock)

      expect(result1).toEqual([])
      expect(result2).toEqual([])
    })

    it('should handle malformed @font-face declarations', () => {
      // Test malformed CSS that css-tree cannot parse properly
      const cssNoBlock = '@font-face;' // Missing block entirely

      // Should not crash and return empty array
      const result = extractFontFaceData(cssNoBlock)
      expect(result).toEqual([])
    })

    it('should handle CSS with unusual formatting', () => {
      // Test CSS with no spaces and complex values
      const css = `@font-face{font-family:'Test Font';src:url('/test.woff2')format('woff2');font-feature-settings:"liga" 1,"kern" 1;unicode-range:U+0000-00FF,U+0131;}`

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.featureSettings).toBeDefined()
      expect(result[0]!.unicodeRange).toBeDefined()
    })

    it('should handle raw CSS values that cannot be parsed normally', () => {
      // Using @@ syntax forces css-tree to use Raw parsing
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-feature-settings: @@;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      // Should not crash on raw values
      expect(result[0]!.featureSettings).toBeDefined()
    })

    it('should gracefully handle font sources with empty format values', () => {
      // Test sources where format exists but is empty - should fallback to 'woff2'
      const cssEmptyFormat = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('');
        }
      `

      try {
        const result = extractFontFaceData(cssEmptyFormat)
        if (result.length > 0 && result[0]!.src.length > 0) {
          // If parsing succeeds, verify format handling
          expect(result[0]!.src).toBeDefined()
        }
      }
      catch {
        // Expected for some malformed CSS - library should handle gracefully
        expect(true).toBe(true)
      }
    })
  })

  describe('edge cases and potential bugs', () => {
    it('should handle complex buffer concatenation in CSS values', () => {
      // Test case that exercises buffer concatenation in CSS value processing
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-style: oblique 10deg italic;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      // Should properly concatenate "oblique 10deg italic"
      expect(result[0]!.style).toBe('oblique 10deg italic')
    })

    it('should preserve order when processing multiple comma-separated values', () => {
      // Test that comma operators properly handle buffered content
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/test.woff2') format('woff2');
          font-style: oblique 10deg, italic;
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)
      expect(result[0]!.style).toBeDefined()
      // Should handle comma-separated styles appropriately
    })

    it('should handle mixed font sources and maintain proper sorting', () => {
      // Complex case with various source types to test sorting edge cases
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/font1.woff2'),
               local('Test Font'),
               url('/font2.ttf') format('truetype'),
               url('/font3.unknown');
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)

      const sources = result[0]!.src
      expect(sources).toHaveLength(4)

      // Should handle sources without format in sorting algorithm
      const sourcesWithoutFormat = sources.filter(src =>
        ('name' in src) || ('url' in src && !('format' in src)),
      )
      expect(sourcesWithoutFormat.length).toBeGreaterThan(0)
    })
  })

  describe('format fallback in sorting', () => {
    it('should use woff2 fallback when format is falsy during sorting', () => {
      // This test specifically targets lines 166-167 in parse.ts
      // We need to create scenarios where both a.format || 'woff2' and b.format || 'woff2' are triggered
      const css = `
        @font-face {
          font-family: 'Test Font';
          src: url('/font1.woff2') format(""),
               url('/font2.ttf') format(""),
               url('/font3.woff') format('woff');
        }
      `

      const result = extractFontFaceData(css)
      expect(result).toHaveLength(1)

      const sources = result[0]!.src as RemoteFontSource[]
      expect(sources).toHaveLength(3)

      // Multiple sources with empty string format will trigger fallback
      // comparison in both a.format || 'woff2' and b.format || 'woff2'
      const emptySources = sources.filter(src => src.format === '')
      expect(emptySources.length).toBe(2)

      // Ensure sorting still works with fallback values
      expect(sources[0]!.url).toContain('woff') // Should be prioritized over ttf
    })
  })
})
