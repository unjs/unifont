import { defineEventHandler, readBody, setResponseHeader, setResponseStatus } from 'nitro/h3'
import { MCP_TOOLS } from '../utils/mcp-tools'

/** Advertised in `initialize`. */
const SERVER_INFO = { name: 'unifont', version: '1' }

/** Newest first: the spec wants an unsupported request answered with a version we do speak. */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

const methods: Record<string, (params: Record<string, unknown>) => unknown | Promise<unknown>> = {
  initialize(params) {
    const requested = params.protocolVersion
    return {
      protocolVersion: typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions: 'Font metadata from every major CDN, through unifont. Use search_fonts to find a family, get_font to see what a provider publishes, and get_font_css when you need CSS to paste.',
    }
  },

  'ping': () => ({}),

  'tools/list': () => ({
    tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }),

  async 'tools/call'(params) {
    const name = params.name as string | undefined
    const args = (params.arguments ?? {}) as Record<string, unknown>
    const tool = MCP_TOOLS.find(candidate => candidate.name === name)

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool "${name}". Available: ${MCP_TOOLS.map(t => t.name).join(', ')}.` }],
        isError: true,
      }
    }

    try {
      return { content: [{ type: 'text', text: await tool.run(args) }] }
    }
    catch (error) {
      // Tool output with `isError`, not a JSON-RPC error, which would tear down the session: a
      // slow provider is something the model can see and retry.
      return {
        content: [{ type: 'text', text: `${name} failed: ${error instanceof Error ? error.message : 'unknown error'}` }],
        isError: true,
      }
    }
  },
}

async function dispatch(request: JsonRpcRequest) {
  const { id, method, params } = request

  // No id means a notification: run it, answer nothing.
  const isNotification = id === undefined || id === null

  if (!method) {
    return isNotification
      ? undefined
      : { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid request: no method.' } }
  }

  const handler = methods[method]
  if (!handler) {
    // `notifications/*` are fire-and-forget; anything else unknown is an error.
    if (isNotification || method.startsWith('notifications/')) {
      return undefined
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
  }

  try {
    const result = await handler(params ?? {})
    return isNotification ? undefined : { jsonrpc: '2.0', id, result }
  }
  catch (error) {
    return isNotification
      ? undefined
      : {
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' },
        }
  }
}

/**
 * MCP server over Streamable HTTP: point a client at `https://unifont.dev/mcp`.
 *
 * TODO: replace the hand-rolled dispatch with h3's `defineJsonRpcHandler`, which works at runtime
 * but has no usable type declaration as of h3 2.0.1-rc.22.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'content-type', 'application/json')

  const body = await readBody<JsonRpcRequest | JsonRpcRequest[]>(event)

  // A batch of only notifications gets no response body at all.
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(dispatch))).filter(Boolean)
    return responses.length ? responses : accepted(event)
  }

  return (await dispatch(body ?? {})) ?? accepted(event)
})

/** Streamable HTTP wants `202 Accepted` with no body for notification-only posts. */
function accepted(event: Parameters<typeof setResponseStatus>[0]) {
  setResponseStatus(event, 202)
  return ''
}
