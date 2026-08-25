import { addTemplate, defineNuxtModule } from 'nuxt/kit'
import { FEATURED_FAMILIES } from '../shared/featured.ts'

/**
 * A rule per family on the front page's index. `fontless` scans stylesheets for `font-family`, so
 * a specimen set through an inline style on the card would never reach the build.
 */
export default defineNuxtModule({
  meta: { name: 'specimen-css' },
  setup(_options, nuxt) {
    const template = addTemplate({
      filename: 'specimen-faces.css',
      write: true,
      getContents: () => `${FEATURED_FAMILIES
        .map(family => `[data-specimen="${family}"] { font-family: "${family}", var(--specimen-fallback); }`)
        .join('\n')}\n`,
    })

    nuxt.options.css.push(template.dst)
  },
})
