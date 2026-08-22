import { defineHandler } from 'nitro'
import { endpoints } from '../lib/endpoints'

export default defineHandler(() => {
  return {
    name: 'unifont-proxy',
    description: 'CORS-enabled read-only proxy for the font APIs unifont talks to.',
    status: 'experimental',
    notice: 'Not for production use. Best-effort, no uptime guarantee, and may change or disappear without notice.',
    documentation: 'https://github.com/unjs/unifont/tree/main/proxy',
    endpoints: endpoints.map(endpoint => ({
      route: endpoint.route,
      query: endpoint.allowQuery ?? [],
      maxAge: endpoint.maxAge,
    })),
  }
})
