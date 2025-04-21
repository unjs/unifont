import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { getOptimizerIdentityFromUrl, groupBy, sanitizeFontSource } from '../utils'

describe('googleicons', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.googleicons()])
    expect(await unifont.resolveFont('Poppins').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont('Material Symbols Outlined')
    const { fonts: legacy } = await unifont.resolveFont('Material Icons Outlined')
    expect(sanitizeFontSource(fonts)).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 100,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 200,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 300,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 500,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 600,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 700,
        },
      ]
    `)

    expect(sanitizeFontSource(legacy)).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
      ]
    `)
  })

  it('handles listNames correctly', async () => {
    const unifont = await createUnifont([providers.googleicons()])
    const names = await unifont.listNames()
    expect(names!.length > 0).toEqual(true)
  })

  it('respects glyphs option and resolves optimized Material Symbols', async () => {
    const unifont = await createUnifont([providers.googleicons({
      experimental: { glyphs: {
        'Material Symbols Outlined': ['arrow_right', 'favorite', 'arrow_drop_down'],
      } },
    })])

    const { fonts } = await unifont.resolveFont('Material Symbols Outlined', {
      styles: ['normal'],
      weights: ['400'],
      subsets: [],
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt => fnt.src.flatMap(src => 'url' in src ? src : []))
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('googleicons', src.url),
    }),
    )
    const identifiersByFormat = groupBy(identities, src => src.format ?? 'unknown')

    expect(identifiersByFormat).toMatchInlineSnapshot(`
      {
        "woff": [
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHeelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDAvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDDxHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCdHOelddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBxG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
          {
            "format": "woff",
            "identifier": {
              "kit": "kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBIG-elddUkzURJv7Jw9tqS79ylFPsyCBNbKzzyVvz7iw",
              "skey": "b8dc2088854b122f",
            },
          },
        ],
        "woff2": [
          {
            "format": "woff2",
            "identifier": {
              "kit": "kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsLjBuVYLAXbrMgiVqo7gtYOQ_jB3ACZtFMEi_fEkPHZig",
              "skey": "b8dc2088854b122f",
            },
          },
        ],
      }
    `)
  })
})
