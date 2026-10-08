import type { FontFaceData } from '../../src'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn } from '../utils'

vi.mock('../../src/fetch', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/fetch')>()
  return {
    fetchWithRetries: (url: string, init?: RequestInit) => mod.fetchWithRetries(url, init, 0),
  }
})

const REMOTE_PROTOCOLS = ['http:', 'https:', 'data:']

let tmp: string
let project: string
let secretFont: string
let secretCss: string

function cssString(value: string) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\t', '\\9 ')}"`
}

function fontFace(sources: string[]) {
  return `@font-face {
  font-family: 'Evil';
  font-weight: 400;
  src: ${sources.map(source => `url(${cssString(source)}) format('woff2')`).join(', ')};
}`
}

function isInside(dir: string, path: string) {
  const rel = relative(dir, resolve(path))
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

/** References to `target`, written from the stylesheet at `from`, in the shapes a parser might accept. */
function referencesTo(target: string, from: string) {
  const rel = relative(dirname(from), target).replaceAll('\\', '/')
  const fileUrl = pathToFileURL(target).href
  return [
    rel,
    rel.replaceAll('/', '\\'),
    rel.replaceAll('..', '%2e%2e'),
    rel.replaceAll('..', '%2E%2E'),
    rel.replaceAll('..', '.%2e'),
    rel.replaceAll('/', '%2F'),
    `./${rel}?v=1#x`,
    `httpx/../${rel}`,
    `files/../../${rel}`,
    target,
    target.replaceAll('\\', '/'),
    fileUrl,
    fileUrl.replace('file://', 'file://localhost'),
    fileUrl.replace(/^file:/, 'FILE:'),
    ` ${fileUrl} `,
    fileUrl.replace('file:', 'fi\tle:'),
    `\\\\?\\${target}`,
    `\\\\localhost\\${target.replace(':', '$')}`,
    `${rel}%00.woff2`,
    'C:/Windows/win.ini',
    'javascript:alert(1)',
    'blob:https://fonts.example.com/font',
  ]
}

async function writePackage(name: string, files: Record<string, string>) {
  const pkgDir = join(project, 'node_modules', name)
  for (const [file, contents] of Object.entries(files)) {
    await mkdir(dirname(join(pkgDir, file)), { recursive: true })
    await writeFile(join(pkgDir, file), contents)
  }
  return pkgDir
}

function createFs() {
  const touched: string[] = []
  return {
    touched,
    readFile: async (path: string) => {
      touched.push(path)
      return readFile(path, 'utf8').catch(() => null)
    },
    exists: async (path: string) => {
      touched.push(path)
      return access(path).then(() => true, () => false)
    },
  }
}

function escapedSources(fonts: FontFaceData[], pkgDir: string) {
  return fonts.flatMap(font => font.src).filter((source) => {
    if (!('url' in source)) {
      return false
    }
    const url = URL.parse(source.url)
    if (!url) {
      return true
    }
    if (url.protocol === 'file:') {
      return !isInside(pkgDir, fileURLToPath(url))
    }
    return !REMOTE_PROTOCOLS.includes(url.protocol)
  })
}

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'unifont-untrusted-'))
  project = join(tmp, 'project')
  secretFont = join(tmp, 'secret.woff2')
  secretCss = join(tmp, 'secret.css')
  await mkdir(project, { recursive: true })
  await writeFile(join(project, 'package.json'), '{}')
  await writeFile(secretFont, 'secret')
  await writeFile(secretCss, fontFace(['./secret.woff2']))
  await writePackage('evil-font-other', { 'files/other.woff2': 'other' })
})

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  return () => vi.restoreAllMocks()
})

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('npm provider with untrusted package contents', () => {
  it('only emits sources inside the package from local stylesheets', async () => {
    const cssPath = join(project, 'node_modules', 'evil-font', 'css', 'fonts.css')
    const benign = [
      '../files/ok.woff2',
      '../files/../files/ok.woff2?v=1#x',
      '..\\files\\ok.woff2',
      '%2e%2e/files/ok.woff2',
      'https://fonts.example.com/ok.woff2',
      'data:font/woff2;base64,AAAA',
    ]
    const hostile = [
      ...referencesTo(secretFont, cssPath),
      ...referencesTo(join(project, 'node_modules', 'evil-font-other', 'files', 'other.woff2'), cssPath),
    ]
    const pkgDir = await writePackage('evil-font', {
      'index.css': '@import "./css/fonts.css";',
      'css/fonts.css': fontFace([...benign, ...hostile]),
      'files/ok.woff2': 'ok',
    })

    const fs = createFs()
    const unifont = await createUnifont([providers.npm({ ...fs, remote: false, root: project })])
    const { fonts } = await unifont.resolveFont('Evil', { options: { npm: { package: 'evil-font' } } })

    expect(escapedSources(fonts, pkgDir)).toEqual([])
    expect(fs.touched.filter(path => path !== `${project}/package.json` && !isInside(pkgDir, path))).toEqual([])
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('does not resolve to a file inside'))
    expect(fonts.flatMap(font => font.src)).toEqual([
      ...Array.from({ length: 4 }, () => ({ url: pathToFileURL(join(pkgDir, 'files', 'ok.woff2')).href, format: 'woff2' })),
      { url: 'https://fonts.example.com/ok.woff2', format: 'woff2' },
      { url: 'data:font/woff2;base64,AAAA', format: 'woff2' },
    ])
  })

  it('only follows @import statements inside the package', async () => {
    const cssPath = join(project, 'node_modules', 'evil-imports', 'index.css')
    const pkgDir = await writePackage('evil-imports', {
      'index.css': [...referencesTo(secretCss, cssPath), './css/fonts.css']
        .map(specifier => `@import ${cssString(specifier)};`)
        .join('\n'),
      'css/fonts.css': fontFace(['../files/ok.woff2']),
      'files/ok.woff2': 'ok',
    })

    const fs = createFs()
    const unifont = await createUnifont([providers.npm({ ...fs, remote: false, root: project })])
    const { fonts } = await unifont.resolveFont('Evil', { options: { npm: { package: 'evil-imports' } } })

    expect(fs.touched.filter(path => path !== `${project}/package.json` && !isInside(pkgDir, path))).toEqual([])
    expect(fonts.flatMap(font => font.src)).toEqual([
      { url: pathToFileURL(join(pkgDir, 'files', 'ok.woff2')).href, format: 'woff2' },
    ])
  })

  it('only reads entry stylesheets from `package.json` inside the package', async () => {
    const fields = [
      ...referencesTo(secretCss, join(project, 'node_modules', 'evil-entry', 'package.json')),
      './css/../../../../secret.css',
    ]

    for (const [index, field] of fields.entries()) {
      const name = `evil-entry-${index}`
      const pkgDir = await writePackage(name, { 'package.json': JSON.stringify({ style: field }) })

      const fs = createFs()
      const unifont = await createUnifont([providers.npm({ ...fs, remote: false, root: project })])
      await unifont.resolveFont('Evil', { options: { npm: { package: name } } })

      expect(fs.touched.filter(path => path !== `${project}/package.json` && !isInside(pkgDir, path)), field).toEqual([])
    }

    const pkgDir = await writePackage('benign-entry', {
      'package.json': JSON.stringify({ style: './css/fonts.css' }),
      'css/fonts.css': fontFace(['../files/ok.woff2']),
      'files/ok.woff2': 'ok',
    })
    const unifont = await createUnifont([providers.npm({ ...createFs(), remote: false, root: project })])
    const { fonts } = await unifont.resolveFont('Evil', { options: { npm: { package: 'benign-entry' } } })
    expect(fonts.flatMap(font => font.src)).toEqual([
      { url: pathToFileURL(join(pkgDir, 'files', 'ok.woff2')).href, format: 'woff2' },
    ])
  })

  it('only fetches stylesheets inside the package from the CDN', async () => {
    const pkgUrl = 'https://cdn.jsdelivr.net/npm/evil-cdn@1.0.0/'
    const hostile = [
      'https://evil.example.com/x.css',
      ' https://evil.example.com/x.css',
      '//evil.example.com/x.css',
      '\\\\evil.example.com/x.css',
      '/\\evil.example.com/x.css',
      '\t//evil.example.com/x.css',
      '../other@1.0.0/x.css',
      '%2e%2e/other@1.0.0/x.css',
      '..\\other@1.0.0\\x.css',
      '/npm/other@1.0.0/x.css',
      'https://cdn.jsdelivr.net/npm/other@1.0.0/x.css',
      'https://cdn.jsdelivr.net/npm/evil-cdn@1.0.0x/x.css',
      'file:///etc/passwd',
    ]
    const fetched: string[] = []
    const restore = mockFetchReturn(/evil|other|cdn\.jsdelivr/, (input) => {
      const url = String(input)
      fetched.push(url)
      if (url === `${pkgUrl}index.css`) {
        return new Response([...hostile, './css/fonts.css'].map(specifier => `@import ${cssString(specifier)};`).join('\n'))
      }
      if (url === `${pkgUrl}css/fonts.css`) {
        return new Response(fontFace(['../files/ok.woff2', 'file:///etc/passwd']))
      }
      return new Response(fontFace(['https://evil.example.com/leak.woff2']))
    })

    try {
      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Evil', { options: { npm: { package: 'evil-cdn', version: '1.0.0' } } })

      expect(fetched.filter(url => !url.startsWith(pkgUrl))).toEqual([])
      expect(fonts.flatMap(font => font.src)).toEqual([
        { url: `${pkgUrl}files/ok.woff2`, format: 'woff2' },
      ])
    }
    finally {
      restore()
    }
  })
})
