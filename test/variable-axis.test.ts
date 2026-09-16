import { describe, expect, it, vi } from 'vitest'
import { createUnifont, defineFontProvider } from '../src'

const variableFileProvider = defineFontProvider('variable-file', async () => {
  return {
    async resolveFont(family) {
      return { fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }] }] }
    },
  }
})

const pinnedProvider = defineFontProvider('pinned', async () => {
  return {
    async resolveFont(family) {
      return { fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }], variationSettings: '"CASL" 0.5, "MONO" 1' }] }
    },
  }
})

const instancingProvider = defineFontProvider('instancing', async () => {
  return {
    async resolveFont(family, options) {
      return {
        fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }] }],
        appliedVariableAxis: options.variableAxis,
      }
    },
  }
})

const partiallyInstancingProvider = defineFontProvider('partially-instancing', async () => {
  return {
    async resolveFont(family, options) {
      return {
        fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }] }],
        appliedVariableAxis: options.variableAxis?.CASL ? { CASL: options.variableAxis.CASL } : {},
      }
    },
  }
})

describe('variableAxis resolve option', () => {
  it('should set font-variation-settings for providers that serve a whole variable font', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { fonts } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: ['1'], MONO: ['0'] },
    })

    expect(fonts[0]!.variationSettings).toBe('"CASL" 1, "MONO" 0')
  })

  it('should skip axes a single font face cannot represent and report them back', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: {
        CASL: [['0', '1']],
        CRSV: ['0', '1'],
        MONO: ['not-a-number'],
        wght: ['700'],
        ital: [1],
      },
    })

    expect(fonts[0]!.variationSettings).toBeUndefined()
    expect(variableAxis).toEqual({
      CASL: { values: [['0', '1']], appliedAs: 'none' },
      CRSV: { values: ['0', '1'], appliedAs: 'none' },
      wght: { values: ['700'], appliedAs: 'none' },
      ital: { values: ['1'], appliedAs: 'none' },
    })
  })

  it('should accept numbers and range objects', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: {
        CASL: [1],
        slnt: [{ min: -15, max: 0 }],
        MONO: [{ min: 1, max: 1 }],
      },
    })

    expect(fonts[0]!.variationSettings).toBe('"CASL" 1, "MONO" 1')
    expect(variableAxis).toEqual({
      CASL: { values: ['1'], appliedAs: 'variation-settings' },
      MONO: { values: ['1'], appliedAs: 'variation-settings' },
      slnt: { values: [['-15', '0']], appliedAs: 'none' },
    })
  })

  it('should drop a range with a value that is not numeric', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { slnt: [['not-a-number', '0']], CASL: [[0, 1]] },
    })

    expect(fonts[0]!.variationSettings).toBeUndefined()
    expect(variableAxis).toEqual({ CASL: { values: [['0', '1']], appliedAs: 'none' } })
  })

  it('should ignore an axis with no values', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: undefined, MONO: [], CRSV: [1] },
    })

    expect(fonts[0]!.variationSettings).toBe('"CRSV" 1')
    expect(variableAxis).toEqual({ CRSV: { values: ['1'], appliedAs: 'variation-settings' } })
  })

  it('should report nothing when no axis survives normalisation', async () => {
    const resolveFont = vi.fn(() => ({ fonts: [] }))
    const provider = defineFontProvider('recording', async () => ({ resolveFont }))
    const unifont = await createUnifont([provider()])
    const { variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: ['not-a-number'], MONO: [] },
    })

    expect(variableAxis).toBeUndefined()
    expect(resolveFont).toHaveBeenCalledWith('Recursive', expect.not.objectContaining({ variableAxis: expect.anything() }))
  })

  it('should report nothing when no axes are requested', async () => {
    const unifont = await createUnifont([variableFileProvider()])
    const { variableAxis } = await unifont.resolveFont('Recursive')

    expect(variableAxis).toBeUndefined()
  })

  it('should set a requested axis in variation settings the provider wrote', async () => {
    const unifont = await createUnifont([pinnedProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: ['1'] },
    })

    expect(fonts[0]!.variationSettings).toBe('"CASL" 1, "MONO" 1')
    expect(variableAxis).toEqual({ CASL: { values: ['1'], appliedAs: 'variation-settings' } })
  })

  it('should keep variation settings it cannot parse', async () => {
    const provider = defineFontProvider('unparsed', async () => ({
      async resolveFont(family: string) {
        return { fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }], variationSettings: 'inherit' }] }
      },
    }))
    const unifont = await createUnifont([provider()])
    const { fonts } = await unifont.resolveFont('Recursive', { variableAxis: { CASL: [1] } })

    expect(fonts[0]!.variationSettings).toBe('inherit, "CASL" 1')
  })

  it('should leave providers that instance the font file alone', async () => {
    const unifont = await createUnifont([instancingProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: ['1'], slnt: [['-15', '0']] },
    })

    expect(fonts[0]!.variationSettings).toBeUndefined()
    expect(variableAxis).toEqual({
      CASL: { values: ['1'], appliedAs: 'font-file' },
      slnt: { values: [['-15', '0']], appliedAs: 'font-file' },
    })
  })

  it('should respect a provider reporting an axis it could not instance', async () => {
    const unifont = await createUnifont([partiallyInstancingProvider()])
    const { fonts, variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: [1], MONO: [1] },
    })

    expect(fonts[0]!.variationSettings).toBeUndefined()
    expect(variableAxis).toEqual({
      CASL: { values: ['1'], appliedAs: 'font-file' },
      MONO: { values: ['1'], appliedAs: 'none' },
    })
  })

  it('should report the values a provider instanced, not the values requested', async () => {
    const provider = defineFontProvider('clamping', async () => ({
      async resolveFont(family: string) {
        return {
          fonts: [{ src: [{ url: `https://example.com/${encodeURIComponent(family)}.woff2` }] }],
          appliedVariableAxis: { wdth: ['75'] },
        }
      },
    }))
    const unifont = await createUnifont([provider()])
    const { variableAxis } = await unifont.resolveFont('Recursive', {
      variableAxis: { wdth: [{ min: 62, max: 100 }] },
    })

    expect(variableAxis).toEqual({ wdth: { values: ['75'], appliedAs: 'font-file' } })
  })

  it('should not expose the instanced axes a provider reports', async () => {
    const unifont = await createUnifont([instancingProvider()])
    const result = await unifont.resolveFont('Recursive', { variableAxis: { CASL: [1] } })

    expect(result).not.toHaveProperty('appliedVariableAxis')
  })

  it('should normalise values before passing them to a provider', async () => {
    const resolveFont = vi.fn(() => ({ fonts: [] }))
    const provider = defineFontProvider('recording', async () => ({ resolveFont }))
    const unifont = await createUnifont([provider()])
    await unifont.resolveFont('Recursive', {
      variableAxis: { CASL: [1], slnt: [{ min: -15, max: 0 }] },
    })

    expect(resolveFont).toHaveBeenCalledWith('Recursive', expect.objectContaining({
      variableAxis: { CASL: ['1'], slnt: [['-15', '0']] },
    }))
  })
})
