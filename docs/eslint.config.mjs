import a11y from 'eslint-plugin-vuejs-accessibility'
import withNuxt from './.nuxt/eslint.config.mjs'
import unifont from './eslint/rules.mjs'

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
}, {
  name: 'unifont/server',
  files: ['server/**/*.ts'],
  plugins: { unifont },
  rules: {
    'unifont/cached-handler-allow-query': 'error',
  },
}, {
  name: 'unifont/client-bundle',
  files: ['app/**/*.{ts,vue}'],
  rules: {
    '@typescript-eslint/no-restricted-imports': ['error', {
      patterns: [{
        group: ['airspace', 'airspace/*', '#shared/collections', '#shared/lexicons'],
        allowTypeImports: true,
        message: 'Reach airspace through a dynamic import, so the lexicon builder stays out of the client bundle.',
      }],
    }],
  },
}, {
  name: 'unifont/shared-constants',
  files: ['shared/atproto.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{ group: ['*'], message: 'Keep this module import-free: a page rendering a stack must not pull in the lexicon builder.' }],
    }],
  },
})
