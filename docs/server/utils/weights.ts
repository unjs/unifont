export interface NormalisedWeights {
  weights: string[]
  /** Notes about any adjustment made, surfaced in the API response. */
  notes: string[]
}

const isRange = (weight: string) => weight.includes(' ')

/**
 * `getFontProperties()` reports a variable family's range *and* its discrete weights, so feeding
 * its output back into `resolveFont()` asks for both at once, and Google's css2 API rejects a
 * range and discrete values on the same axis.
 *
 * TODO: drop once unifont splits the request itself (`unjs/unifont#fix-resolve-mismatch`).
 */
export function normaliseWeights(requested: string[]): NormalisedWeights {
  const ranges = requested.filter(isRange)
  const statics = requested.filter(weight => !isRange(weight))

  if (!ranges.length || !statics.length) {
    return { weights: requested, notes: [] }
  }

  return {
    weights: [ranges[0]!],
    notes: [
      `Narrowed to the variable range ${ranges[0]}, which already spans the discrete weights you asked for (${statics.join(', ')}).`,
    ],
  }
}
