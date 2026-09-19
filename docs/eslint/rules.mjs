/**
 * Rules local to this site, kept here rather than published.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
export default {
  meta: { name: 'unifont' },
  rules: {
    'cached-handler-allow-query': {
      meta: {
        type: 'problem',
        docs: { description: 'Declare the query parameters a cached handler reads.' },
        schema: [],
        messages: {
          missing: 'A cached handler reading `getQuery` must set `allowQuery`, or any query string will key a new cache entry.',
        },
      },
      create(context) {
        let readsQuery = false
        /** @type {import('estree').CallExpression[]} */
        const handlers = []

        return {
          CallExpression(node) {
            const name = node.callee.type === 'Identifier' ? node.callee.name : undefined
            if (name === 'getQuery') {
              readsQuery = true
            }
            if (name !== 'defineCachedHandler') {
              return
            }
            const options = node.arguments[1]
            const declared = options?.type === 'ObjectExpression' && options.properties.some(property =>
              property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'allowQuery',
            )
            if (!declared) {
              handlers.push(node)
            }
          },
          'Program:exit': function () {
            if (!readsQuery) {
              return
            }
            for (const node of handlers) {
              context.report({ node: node.callee, messageId: 'missing' })
            }
          },
        }
      },
    },
  },
}
