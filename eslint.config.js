import antfu from '@antfu/eslint-config'

export default antfu().append({
  files: ['playground/**'],
  rules: {
    'antfu/no-top-level-await': 'off',
    'no-console': 'off',
  },
})
