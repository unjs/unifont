import { defineLexicons, field } from 'airspace/lexicon'
import { NAMESPACE } from './atproto'

/** Publish with `airspace lexicons publish --identity <handle> --lexicons ./shared/lexicons.ts`. */
export default defineLexicons(NAMESPACE, {
  stack: {
    description: 'A heading, body and mono pairing chosen on unifont.dev.',
    title: field.text({ max: 120 }),
    note: field.text({ max: 500 }).optional().describe('Why these faces, in the author’s words.'),
    roles: field.list(field.object({
      role: field.enum(['heading', 'body', 'mono']),
      family: field.text({ max: 120 }),
      provider: field.text({ max: 32 }).optional().describe('The unifont provider that resolved it.'),
      uri: field.url().describe('Canonical page for the family, and the key backlink indexes join on.'),
      weights: field.list(field.text({ max: 16 })).optional(),
    })),
    app: field.url().describe('The application that wrote the record. Constant, so stacks are discoverable as backlinks.'),
    createdAt: field.datetime(),
  },
})
