import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { sanitizeFontSource } from '../utils'

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

  it('respects glyphs option and resolves optimized Material Symbols', async () => {
    const unifont = await createUnifont([providers.googleicons()])

    const { fonts } = await unifont.resolveFont('Material Symbols Outlined', {
      glyphs: ['arrow_right', 'favorite', 'arraw_drop_down'],
      styles: ['normal'],
      weights: ['400'],
      subsets: [],
    })

    // Do not use sanitizeFontSource here, as we must test the url parameters
    expect(fonts).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsLjBuVYRAXlv94mR5I3mdcRbO7a3RmptnIcogHaoSnWx03LjDeOpP5MpNgr_g&skey=b8dc2088854b122f&v=v222",
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
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHeelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 100,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDAvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 200,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDDxHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 300,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCvHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDCdHOelHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 500,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBxG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 600,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1p-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1t-p_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1i-q_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/icon/font?kit=kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzazHD_dY43zj-jCxv3fzvRNU22ZXGJpEpjC_1n-q_4MrImHCIJIZrDBIG-elHdUa3lJNrop87duNwMq-FeICCjJDAsrsZyT0xqdv_vUCh_3tDTxuUA&skey=b8dc2088854b122f&v=v222",
            },
          ],
          "style": "normal",
          "weight": 700,
        },
      ]
    `)
  })
})
