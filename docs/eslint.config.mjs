import a11y from 'eslint-plugin-vuejs-accessibility'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(...a11y.configs['flat/recommended'], {
  rules: {
    // Labels here are bound with `for`, which the default configuration does not accept alone.
    'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],

    // Top-level await in pages is the point.
    'antfu/no-top-level-await': 'off',
    // Splitting a link's text onto its own line puts whitespace inside the anchor, which
    // `text-decoration` then underlines past the last character.
    'vue/singleline-html-element-content-newline': 'off',
  },
})
