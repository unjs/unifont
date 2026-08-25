export interface NormalisedWeights {
  weights: string[]
  /** Notes about any adjustment made, surfaced in the API response. */
  notes: string[]
}

const isRange = (weight: string) => weight.includes(' ')

export function nearestWeight(published: string[], target: number) {
  const numeric = published.map(Number).filter(Number.isFinite)
  if (!numeric.length) {
    return published[0] ?? '400'
  }
  return String(numeric.reduce((best, weight) => (Math.abs(weight - target) < Math.abs(best - target) ? weight : best), numeric[0]!))
}

/** A static cut in preference to the variable range, which is several times the size. */
export function specimenWeights(published: string[]) {
  const statics = published.filter(weight => !isRange(weight))
  return [statics.length ? nearestWeight(statics, 400) : published[0] ?? '400']
}

export function specimenSubsets(published: string[] | null | undefined) {
  if (!published?.length) {
    return ['latin']
  }
  return [published.includes('latin') ? 'latin' : published[0]!]
}

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
