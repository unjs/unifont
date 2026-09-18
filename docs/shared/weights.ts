/** The published weight closest to a target, for a family that does not publish the target itself. */
export function nearestWeight(published: string[], target: number) {
  const numeric = published.map(Number).filter(Number.isFinite)
  if (!numeric.length) {
    return published[0] ?? '400'
  }
  return String(numeric.reduce((best, weight) => (Math.abs(weight - target) < Math.abs(best - target) ? weight : best), numeric[0]!))
}
