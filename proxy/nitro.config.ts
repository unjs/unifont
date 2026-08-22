import { defineConfig } from 'nitro'

export default defineConfig({
  compatibilityDate: '2026-06-10',
  // Routes and handlers live at the package root rather than in a `server/` directory.
  serverDir: './',
  routeRules: {
    '/**': {
      cors: true,
      headers: {
        'access-control-max-age': '21600',
        'x-proxy-status': 'experimental; see https://github.com/unjs/unifont/tree/main/proxy',
      },
    },
  },
})
