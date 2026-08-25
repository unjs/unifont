import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { openApiDocument } from '../../server/utils/openapi'

const document = openApiDocument('https://unifont.dev')

type Operation = {
  operationId?: string
  summary?: string
  description?: string
  parameters?: { name: string, in: string, required?: boolean, description?: string, schema?: Record<string, unknown> }[]
  responses?: Record<string, { description?: string, content?: Record<string, { schema?: Record<string, unknown> }> }>
}

const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
  Object.entries(methods as Record<string, Operation>).map(([method, operation]) => ({ path, method, operation })),
)

/** Every handler under `server/api/v1`, as the path it answers on. */
function handlerPaths() {
  const root = fileURLToPath(new URL('../../server/api/v1', import.meta.url))
  const paths: string[] = []

  const walk = (directory: string, prefix: string) => {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry)
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}/${entry.replace(/^\[(\.{3})?(.+)\]$/, '{$2}')}`)
        continue
      }
      const name = entry.replace(/\.(get|post)\.ts$/, '')
      // `catalogue.css` and `specimens.css` serve this site's specimen grids, not the API.
      if (name.endsWith('.css')) {
        continue
      }
      paths.push(name === 'index' ? prefix : `${prefix}/${name.replace(/^\[(.+)\]$/, '{$1}')}`)
    }
  }

  walk(root, '/api/v1')
  return paths
}

describe('openApiDocument', () => {
  it('should be an OpenAPI 3.1 document with info and a server', () => {
    expect(document.openapi).toBe('3.1.0')
    expect(document.info.title).toContain('unifont')
    expect(document.info.version).toBe('1.0.0')
    expect(document.info.description.length).toBeGreaterThan(200)
    expect(document.servers).toEqual([{ url: 'https://unifont.dev', description: 'Production' }])
  })

  it('should take its server from the origin it is given, without a trailing slash', () => {
    expect(openApiDocument('http://localhost:3000/').servers[0]!.url).toBe('http://localhost:3000')
  })

  it('should describe every endpoint under /api/v1, plus the MCP endpoint', () => {
    for (const path of handlerPaths()) {
      expect(Object.keys(document.paths)).toContain(path)
    }
    expect(document.paths['/mcp']).toBeTruthy()
  })

  it('should give every operation a unique operationId', () => {
    const ids = operations.map(({ operation }) => operation.operationId)
    expect(ids.every(id => typeof id === 'string' && /^[a-z][A-Za-z]+$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should give every operation a summary, a description and a tag', () => {
    const tags = document.tags.map(tag => tag.name)
    for (const { path, method, operation } of operations) {
      expect(operation.summary, `${method} ${path}`).toBeTruthy()
      expect(operation.description!.length, `${method} ${path}`).toBeGreaterThan(40)
      expect(tags, `${method} ${path}`).toContain((operation as { tags: string[] }).tags[0])
    }
  })

  it('should type and describe every parameter', () => {
    for (const { path, method, operation } of operations) {
      for (const parameter of operation.parameters ?? []) {
        expect(parameter.schema?.type ?? parameter.schema?.enum, `${method} ${path} ${parameter.name}`).toBeTruthy()
        expect(parameter.description, `${method} ${path} ${parameter.name}`).toBeTruthy()
        expect(['path', 'query'], `${method} ${path} ${parameter.name}`).toContain(parameter.in)
      }
    }
  })

  it('should require every path parameter that appears in the template', () => {
    for (const { path, operation } of operations) {
      for (const name of [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1])) {
        const parameter = operation.parameters?.find(candidate => candidate.name === name)
        expect(parameter, `${path} ${name}`).toBeTruthy()
        expect(parameter!.in).toBe('path')
        expect(parameter!.required).toBe(true)
      }
    }
  })

  it('should give every response a description and a schema', () => {
    for (const { path, method, operation } of operations) {
      const responses = Object.entries(operation.responses ?? {})
      expect(responses.length, `${method} ${path}`).toBeGreaterThan(0)
      for (const [status, response] of responses) {
        expect(response.description, `${method} ${path} ${status}`).toBeTruthy()
        if (status !== '202') {
          expect(Object.keys(response.content ?? {}).length, `${method} ${path} ${status}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('should resolve every $ref against components.schemas', () => {
    const refs = new Set<string>()
    const walk = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(walk)
      }
      else if (value && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          if (key === '$ref' && typeof nested === 'string') {
            refs.add(nested)
          }
          else {
            walk(nested)
          }
        }
      }
    }
    walk(document.paths)

    expect(refs.size).toBeGreaterThan(5)
    for (const ref of refs) {
      const name = ref.replace('#/components/schemas/', '')
      expect(document.components.schemas, ref).toHaveProperty(name)
    }
  })

  it('should describe every schema property, so a function-calling client can prompt with it', () => {
    for (const [name, schema] of Object.entries(document.components.schemas)) {
      expect((schema as { type: string }).type, name).toBe('object')
      expect(Object.keys((schema as { properties: object }).properties ?? {}).length, name).toBeGreaterThan(0)
    }
  })
})
