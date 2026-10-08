import { fnv1a64Base36 } from 'fnv1a-64'

function serialize(value: unknown, seen: Set<object>): string {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'number':
    case 'boolean':
    case 'bigint':
      return `${typeof value}:${String(value)}`
    case 'undefined':
      return 'undefined'
    case 'symbol':
      return `symbol:${value.description ?? ''}`
    case 'function':
      return `function:${value.toString()}`
  }

  if (value === null)
    return 'null'

  const obj = value as object
  if (seen.has(obj))
    return 'circular'
  seen.add(obj)
  try {
    if (Array.isArray(obj))
      return `[${obj.map(v => serialize(v, seen)).join(',')}]`
    if (obj instanceof Date)
      return `date:${obj.toISOString()}`
    if (obj instanceof RegExp)
      return `regexp:${obj.toString()}`
    if (obj instanceof Map)
      return `map:${serialize([...obj.entries()].map(e => serialize(e, seen)).sort(), seen)}`
    if (obj instanceof Set)
      return `set:${serialize([...obj].map(v => serialize(v, seen)).sort(), seen)}`
    const entries = Object.keys(obj)
      .sort()
      .map(key => `${JSON.stringify(key)}:${serialize((obj as Record<string, unknown>)[key], seen)}`)
    return `{${entries.join(',')}}`
  }
  finally {
    seen.delete(obj)
  }
}

/** Stable, non-cryptographic hash of a value, suitable for cache keys. */
export function hash(value: unknown): string {
  return fnv1a64Base36(serialize(value, new Set()))
}
