// @ts-check

import { createUnifont, providers } from 'unifont'

const unifont = await createUnifont([
  providers.google(),
])

const fonts = await unifont.resolveFont({ fontFamily: 'Poppins', provider: 'google' })

console.log(fonts)
