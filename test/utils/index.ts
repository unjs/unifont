// Quick and dirty way to pick into a new array, not needed if the test is un-necessary
export function pickUniqueBy<T, K>(arr: T[], by: (arg: T) => K): K[] {
  return [...arr.reduce((acc, fnt) => {
    const prop = by(fnt)
    if (!acc.has(prop))
      acc.add(prop)
    return acc
  }, new Set<K>())]
}
