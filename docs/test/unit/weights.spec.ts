import { describe, expect, it } from 'vitest'
import { normaliseWeights } from '../../server/utils/weights'

describe('normaliseWeights', () => {
  it('should leave a list of discrete weights untouched', () => {
    expect(normaliseWeights(['400', '700'])).toEqual({ weights: ['400', '700'], notes: [] })
  })

  it('should leave a lone variable range untouched', () => {
    expect(normaliseWeights(['200 800'])).toEqual({ weights: ['200 800'], notes: [] })
  })

  it('should keep only the range when a range and discrete weights are mixed', () => {
    const result = normaliseWeights(['200', '400', '700', '200 800'])
    expect(result.weights).toEqual(['200 800'])
    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toContain('200 800')
  })

  it('should keep the first range when several are present alongside statics', () => {
    expect(normaliseWeights(['400', '100 400', '400 900']).weights).toEqual(['100 400'])
  })

  it('should pass an empty list through', () => {
    expect(normaliseWeights([])).toEqual({ weights: [], notes: [] })
  })
})
