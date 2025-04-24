import { describe, expect, it } from 'vitest'
import { prepareWeights } from '../src/utils'

describe('utils', () => {
  describe('prepareWeights()', () => {
    it('keeps variable weights if available', () => {
      expect(prepareWeights({
        inputWeights: ['400 900'],
        hasVariableWeights: true,
        weights: [],
      })).toEqual([{ weight: '400 900', variable: true }])
    })

    it('returns nothing if a variable weight has no fallbacks', () => {
      expect(prepareWeights({
        inputWeights: ['300 700'],
        hasVariableWeights: false,
        weights: [],
      })).toEqual([])
    })

    it('returns standard weights as fallbacks for a variable font if available', () => {
      expect(
        prepareWeights({
          inputWeights: ['400 600'],
          hasVariableWeights: false,
          weights: ['300', '400', '500', '600', '700'],
        }),
      ).toEqual([
        { weight: '400', variable: false },
        { weight: '500', variable: false },
        { weight: '600', variable: false },
      ])
    })

    it('returns standard weights if available', () => {
      expect(prepareWeights({
        inputWeights: ['400', '500', '600'],
        hasVariableWeights: false,
        weights: ['300', '400'],
      })).toEqual([{ weight: '400', variable: false }])
    })

    it('deduplicates weights', () => {
      expect(
        prepareWeights({
          inputWeights: ['400 500', '300', '400', '500'],
          hasVariableWeights: false,
          weights: ['300', '400', '500'],
        }),
      ).toEqual([
        { weight: '400', variable: false },
        { weight: '500', variable: false },
        { weight: '300', variable: false },
      ])
    })
  })
})
