import { comarkContent } from 'comark-content'
import fs from 'comark-content/sources/fs'

export const content = comarkContent({
  source: fs('./content'),
})
