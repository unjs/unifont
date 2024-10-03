// @ts-check

import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const fonts = await unifont.resolveFontFace('Poppins')

console.log(fonts)
