import { createError } from 'nuxt/server'
import { lookupFamily } from './catalogue'

/** Both `nuxt/server` and `nitro/h3` handlers, which carry different event types. */
interface RoutedEvent {
  context: { params?: Record<string, string | undefined> }
}

/** The catalogue's spelling of a family name: providers match a name exactly, callers do not. */
export async function canonicalFamily(family: string) {
  const entry = await lookupFamily(family).catch(() => undefined)
  return entry?.family ?? family
}

/** The `family` route parameter, as the catalogue spells it. */
export async function familyParam(event: RoutedEvent) {
  const family = decodeURIComponent(event.context.params?.family || '')
  if (!family) {
    throw createError({ status: 400, statusText: 'A font family is required.' })
  }
  return await canonicalFamily(family)
}
