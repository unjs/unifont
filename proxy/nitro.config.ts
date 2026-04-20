import { defineConfig } from 'nitro'
import { isProduction } from 'std-env'

export default defineConfig({
  routeRules: {
    '/**': {
      // 6 hours in production, no cache in development
      isr: isProduction ? 60 * 60 * 6 : false,
      headers: isProduction ? { 'access-control-max-age': '21600' } : {}, // 6 hours
    },
    '/adobe/v1/kit-css/*.css': {
      proxy: 'https://use.typekit.net/*.css',
    },
    '/adobe/v1/kit/*': {
      proxy: 'https://typekit.com/api/v1/json/kits/*/published',
    },
    '/bunny/v1/list': {
      proxy: 'https://fonts.bunny.net/list',
    },
    '/bunny/v1/css': {
      proxy: 'https://fonts.bunny.net/css',
    },
    '/fontshare/v1/fonts': {
      proxy: 'https://api.fontshare.com/v2/fonts',
    },
    '/fontshare/v1/css': {
      proxy: 'https://api.fontshare.com/v2/css',
    },
    '/fontsource/v1/fonts': {
      proxy: 'https://api.fontsource.org/v1/fonts',
    },
    '/fontsource/v1/fonts/*': {
      proxy: 'https://api.fontsource.org/v1/fonts/*',
    },
    '/fontsource/v1/variable/*': {
      proxy: 'https://api.fontsource.org/v1/variable/*',
    },
    '/google/v1/fonts': {
      proxy: 'https://fonts.google.com/metadata/fonts',
    },
    '/google/v1/css': {
      proxy: {
        to: 'https://fonts.googleapis.com/css2',
        forwardHeaders: ['user-agent'],
      },
    },
    '/google/v1/icons': {
      proxy:
        'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true',
    },
    '/google/v1/icon': {
      proxy: {
        to: 'https://fonts.googleapis.com/icon',
        forwardHeaders: ['user-agent'],
      },
    },
  },
})
