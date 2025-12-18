import antfu from '@antfu/eslint-config'

export default antfu().append({
  files: ['playground/**'],
  rules: {
    'antfu/no-top-level-await': 'off',
    'no-console': 'off',
    'pnpm/json-enforce-catalog': 'off',
    'pnpm/yaml-enforce-settings': 'off',
  },
}, {
  rules: {
    '@stylistic/object-curly-newline': ['error', {
      ImportDeclaration: 'never',
      ExportDeclaration: 'never',
    }],
  },
})
