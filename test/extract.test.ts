import { describe, expect, it } from 'vitest'
import { extractFontFaceData } from '../src/css/parse'

describe('extract font face from CSS', () => {
  it('should add declarations for `font-family`', () => {
    expect(extractFontFaceData(`
    @font-face {
      font-family: 'Open Sans';
      font-style: normal;
      font-display: swap;
      font-weight: 500;
      src: local("Open Sans"), url(./files/open-sans-latin-500-normal.woff2) format('woff2') tech('color-COLRv1'), url(./files/open-sans-latin-500-normal.woff) format(woff) tech(color-COLRv1);
      unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }
    `))
      .toMatchInlineSnapshot(`
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
    @font-face {}`)).toMatchInlineSnapshot(`[]`)
  })

  it('should correctly merge duplicate font faces and duplicate font sources', () => {
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

  it('should handle multi-value font-style', () => {
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

  it('should always return unicodeRange as an array', () => {
    expect(
      extractFontFaceData(`
@font-face {
  src: url(https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmYiAr0klQmz24O0g.woff2) format("woff2");
  unicode-range: U+1F00-1FFF;
}`),
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
