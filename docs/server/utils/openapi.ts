import { PROVIDER_NAMES, QUERYABLE_PROVIDERS } from './unifont'

const provider = {
  type: 'string',
  enum: [...PROVIDER_NAMES],
  description: `Provider name. Queryable without credentials: ${QUERYABLE_PROVIDERS.join(', ')}.`,
} as const

const commaList = (description: string) => ({ type: 'string' as const, description })

const familyParameter = {
  name: 'family',
  in: 'path',
  required: true,
  description: 'Font family name, percent-encoded. Matching ignores case.',
  schema: { type: 'string' },
  example: 'Newsreader',
} as const

const providerScope = {
  name: 'provider',
  in: 'query',
  required: false,
  description: 'Limit the provider cascade to these providers (comma-separated).',
  schema: commaList('Comma-separated provider names.'),
  example: 'google,bunny',
} as const

const selectionParameters = [
  providerScope,
  {
    name: 'weights',
    in: 'query',
    required: false,
    description: 'Weights to resolve (comma-separated). A range such as `200 800` resolves a variable axis.',
    schema: commaList('Comma-separated weights.'),
    example: '400,600',
  },
  {
    name: 'styles',
    in: 'query',
    required: false,
    description: 'Styles to resolve (comma-separated): `normal`, `italic` or `oblique`.',
    schema: commaList('Comma-separated styles.'),
    example: 'normal,italic',
  },
  {
    name: 'subsets',
    in: 'query',
    required: false,
    description: 'Unicode subsets to resolve (comma-separated), e.g. `latin`, `latin-ext`, `cyrillic`.',
    schema: commaList('Comma-separated subsets.'),
    example: 'latin,latin-ext',
  },
] as const

const schemas = {
  Error: {
    type: 'object',
    description: 'The error shape every endpoint uses. `status` repeats the HTTP status code.',
    properties: {
      status: { type: 'integer', description: 'HTTP status code.' },
      statusText: { type: 'string', description: 'Short reason phrase.' },
      message: { type: 'string', description: 'What went wrong, naming the family or provider where relevant.' },
    },
    required: ['status', 'message'],
  },
  ProviderSummary: {
    type: 'object',
    description: 'One provider, and how much of its library this site can see.',
    properties: {
      name: provider,
      label: { type: 'string', description: 'Human-readable provider name.' },
      origin: { type: 'string', description: 'Host the metadata is read from.' },
      requiresOptions: { type: 'boolean', description: 'Whether the provider needs per-user credentials before it can be queried.' },
      note: { type: 'string', description: 'What the provider is good for, and its limitations.' },
      families: { type: ['integer', 'null'], description: 'Families the provider lists, or `null` when it cannot enumerate its library.' },
      unavailable: { type: 'boolean', description: 'Whether the provider failed to answer while the current index was built.' },
    },
    required: ['name', 'label', 'origin', 'requiresOptions', 'note', 'families', 'unavailable'],
  },
  ProvidersResponse: {
    type: 'object',
    properties: {
      providers: { type: 'array', items: { $ref: '#/components/schemas/ProviderSummary' } },
    },
    required: ['providers'],
  },
  StatusResponse: {
    type: 'object',
    properties: {
      families: { type: 'integer', description: 'Families in the merged index.' },
      providers: { type: 'integer', description: 'Providers that answered while the index was built.' },
      unavailable: { type: 'array', items: provider, description: 'Providers that did not answer.' },
      indexAge: { type: 'integer', description: 'Milliseconds since the merged index was built.' },
      crossListed: { type: 'integer', description: 'Families published by more than one provider.' },
    },
    required: ['families', 'providers', 'unavailable', 'indexAge', 'crossListed'],
  },
  CatalogueEntry: {
    type: 'object',
    properties: {
      family: { type: 'string', description: 'Family name as the provider spells it.' },
      providers: { type: 'array', items: provider, description: 'Providers that publish this family.' },
      facets: {
        type: 'object',
        description: 'Absent for a family whose only provider publishes no properties in its index.',
        properties: {
          variable: { type: 'boolean', description: 'The family publishes a weight range, not only discrete weights.' },
          italic: { type: 'boolean' },
          subsets: { type: 'array', items: { type: 'string' } },
        },
        required: ['variable', 'italic', 'subsets'],
      },
    },
    required: ['family', 'providers'],
  },
  FacetsResponse: {
    type: 'object',
    properties: {
      variable: { type: 'integer', description: 'Families publishing a weight range.' },
      italic: { type: 'integer', description: 'Families publishing an italic.' },
      subsets: {
        type: 'array',
        description: 'Scripts the index knows about, most families first.',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, families: { type: 'integer' } },
          required: ['name', 'families'],
        },
      },
      unknown: { type: 'integer', description: 'Families whose only provider publishes no properties, so no filter can keep them.' },
    },
    required: ['variable', 'italic', 'subsets', 'unknown'],
  },
  FontsResponse: {
    type: 'object',
    properties: {
      total: { type: 'integer', description: 'Matches before `limit` and `offset` are applied.' },
      families: { type: 'array', items: { $ref: '#/components/schemas/CatalogueEntry' } },
      unavailable: { type: 'array', items: provider, description: 'Providers missing from these results because they did not answer.' },
    },
    required: ['total', 'families'],
  },
  FontFace: {
    type: 'object',
    description: 'One resolved `@font-face`.',
    properties: {
      weight: { type: ['string', 'number'], description: 'Weight or variable weight range.' },
      style: { type: 'string', description: '`normal`, `italic` or `oblique`.' },
      display: { type: 'string', description: '`font-display` value, when the provider sets one.' },
      unicodeRange: { type: 'array', items: { type: 'string' }, description: 'The `unicode-range` the face covers.' },
      src: {
        type: 'array',
        description: 'Sources, in cascade order.',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Absolute URL of the font file on the provider CDN.' },
            format: { type: 'string', description: 'Font format, e.g. `woff2`.' },
            name: { type: 'string', description: 'Local family name, for a `local()` source.' },
          },
        },
      },
    },
  },
  FontResponse: {
    type: 'object',
    properties: {
      family: { type: 'string', description: 'The family as requested.' },
      provider: { type: 'string', description: 'Provider that answered.' },
      providers: { type: 'array', items: provider, description: 'Every provider that publishes the family.' },
      origin: { type: 'string', description: 'Host the answering provider reads from.' },
      properties: {
        type: 'object',
        description: 'Everything the provider publishes, before the request narrowed it.',
        properties: {
          weights: { type: ['array', 'null'], items: { type: 'string' } },
          styles: { type: ['array', 'null'], items: { type: 'string' } },
          subsets: { type: ['array', 'null'], items: { type: 'string' } },
          formats: { type: ['array', 'null'], items: { type: 'string' } },
        },
      },
      requested: {
        type: 'object',
        description: 'The selection this response resolves, after defaults were applied.',
        properties: {
          weights: { type: 'array', items: { type: 'string' } },
          styles: { type: 'array', items: { type: 'string' } },
          subsets: { type: 'array', items: { type: 'string' } },
          formats: { type: 'array', items: { type: 'string' } },
        },
      },
      notes: { type: 'array', items: { type: 'string' }, description: 'Where a requested weight was rounded or dropped.' },
      fonts: { type: 'array', items: { $ref: '#/components/schemas/FontFace' } },
      fallbacks: { type: 'array', items: { type: 'string' }, description: 'Generic fallbacks the provider suggests.' },
      css: { type: 'string', description: 'Ready-to-serve `@font-face` CSS for the selection, including a metric-matched fallback where one can be built.' },
    },
    required: ['family', 'providers', 'fonts', 'css'],
  },
  TransferResponse: {
    type: 'object',
    properties: {
      family: { type: 'string' },
      faces: { type: 'integer', description: 'Resolved `@font-face` rules.' },
      files: { type: 'integer', description: 'Distinct font files behind those faces.' },
      measured: { type: 'integer', description: 'Files that reported a `content-length`.' },
      bytes: { type: 'integer', description: 'Total transfer size of the measured files.' },
    },
    required: ['family', 'faces', 'files', 'measured', 'bytes'],
  },
  StacksResponse: {
    type: 'object',
    description: 'Stacks published as `dev.unifont.stack` records in their authors’ own accounts.',
    properties: {
      stacks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rkey: { type: 'string' },
            author: {
              type: 'object',
              properties: {
                did: { type: 'string' },
                handle: { type: 'string' },
                displayName: { type: 'string' },
                avatar: { type: 'string' },
              },
              required: ['did', 'handle'],
            },
            stack: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                note: { type: 'string' },
                app: { type: 'string' },
                createdAt: { type: 'string' },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['heading', 'body', 'mono'] },
                      family: { type: 'string' },
                      provider: { type: 'string' },
                      uri: { type: 'string' },
                      weights: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['role', 'family', 'uri'],
                  },
                },
              },
              required: ['title', 'roles', 'app', 'createdAt'],
            },
          },
          required: ['rkey', 'author', 'stack'],
        },
      },
      total: { type: 'integer', description: 'How many the backlink index knows about.' },
      unavailable: { type: 'boolean', description: '`true` when the index could not be reached.' },
    },
    required: ['stacks'],
  },
  BaselineTransferResponse: {
    type: 'object',
    properties: {
      basis: {
        type: 'object',
        description: 'The selection every figure is quoted against.',
        properties: {
          weights: { type: 'array', items: { type: 'string' } },
          styles: { type: 'array', items: { type: 'string' } },
          subsets: { type: 'array', items: { type: 'string' } },
          formats: { type: 'array', items: { type: 'string' } },
        },
        required: ['weights', 'styles', 'subsets', 'formats'],
      },
      families: {
        type: 'object',
        description: 'Keyed by family. `null` where no provider resolved it, or no file reported a length.',
        additionalProperties: {
          type: ['object', 'null'],
          properties: {
            bytes: { type: 'integer' },
            files: { type: 'integer' },
            measured: { type: 'integer', description: 'Files that reported a `content-length`.' },
          },
          required: ['bytes', 'files', 'measured'],
        },
      },
    },
    required: ['basis', 'families'],
  },
  FallbackResponse: {
    type: 'object',
    properties: {
      family: { type: 'string' },
      name: { type: 'string', description: 'The family name the generated face is declared under.' },
      generic: { type: 'string', description: 'The generic the adjustment is built against.' },
      fallbacks: { type: 'array', items: { type: 'string' } },
      css: { type: 'string', description: 'Empty when no metrics could be read from the served file.' },
      overrides: {
        type: ['object', 'null'],
        properties: {
          sizeAdjust: { type: ['string', 'null'] },
          ascentOverride: { type: ['string', 'null'] },
          descentOverride: { type: ['string', 'null'] },
          lineGapOverride: { type: ['string', 'null'] },
        },
      },
    },
    required: ['family', 'name', 'generic', 'fallbacks', 'css', 'overrides'],
  },
  BudgetResponse: {
    type: 'object',
    properties: {
      family: { type: 'string' },
      text: { type: 'string', description: 'The text as priced, whitespace-collapsed and capped.' },
      provider: { type: ['string', 'null'], description: 'The provider that answered.' },
      characters: { type: 'integer', description: 'Distinct non-whitespace code points in the text.' },
      weights: { type: 'array', items: { type: 'string' } },
      styles: { type: 'array', items: { type: 'string' } },
      plans: {
        type: 'array',
        description: 'Everything published, what the text pulls, and, where the provider can subset to a glyph list, that too.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            faces: { type: 'integer' },
            files: { type: 'integer' },
            measured: { type: 'integer', description: 'Files whose size is known.' },
            bytes: { type: 'integer' },
          },
          required: ['label', 'faces', 'files', 'measured', 'bytes'],
        },
      },
    },
    required: ['family', 'text', 'provider', 'characters', 'weights', 'styles', 'plans'],
  },
  CompareResponse: {
    type: 'object',
    properties: {
      family: { type: 'string' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            provider: provider,
            label: { type: 'string' },
            available: { type: 'boolean', description: 'Whether the provider publishes the family.' },
            origin: { type: 'string' },
            weights: { type: ['array', 'null'], items: { type: 'string' } },
            styles: { type: ['array', 'null'], items: { type: 'string' } },
            subsets: { type: ['array', 'null'], items: { type: 'string' } },
            formats: { type: ['array', 'null'], items: { type: 'string' } },
            faces: { type: 'integer' },
            files: { type: 'integer' },
            bytes: { type: 'integer', description: 'Transfer size of the measured files.' },
            measured: { type: 'integer' },
            host: { type: ['string', 'null'], description: 'Host the font files are served from.' },
            fallbacks: { type: 'array', items: { type: 'string' } },
            error: { type: 'string', description: 'Why this provider could not answer.' },
          },
          required: ['provider', 'label', 'available'],
        },
      },
    },
    required: ['family', 'results'],
  },
  CoverageResponse: {
    type: 'object',
    properties: {
      family: { type: 'string' },
      provider: { type: 'string' },
      checks: {
        type: 'object',
        description: 'One entry per sample, keyed by sample name, or a single `custom` entry when `text` was passed.',
        additionalProperties: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text checked.' },
            unrestricted: { type: 'boolean', description: 'Whether a face without a `unicode-range` covers the text by default.' },
            covered: { type: 'array', items: { type: 'string' }, description: 'Characters the resolved faces can draw.' },
            missing: { type: 'array', items: { type: 'string' }, description: 'Characters no resolved face covers.' },
            subsets: { type: 'array', items: { type: 'string' }, description: 'Subsets that carry the covered characters.' },
          },
          required: ['text', 'covered', 'missing'],
        },
      },
    },
    required: ['family', 'checks'],
  },
  ContributorsResponse: {
    type: 'object',
    properties: {
      contributors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            login: { type: 'string' },
            avatar: { type: 'string' },
            url: { type: 'string' },
            contributions: { type: 'integer' },
          },
          required: ['login', 'avatar', 'url', 'contributions'],
        },
      },
      unavailable: { type: 'boolean', description: '`true` when GitHub did not answer.' },
    },
    required: ['contributors', 'unavailable'],
  },
  JsonRpcRequest: {
    type: 'object',
    description: 'A JSON-RPC 2.0 request, as the Model Context Protocol defines it.',
    properties: {
      jsonrpc: { type: 'string', const: '2.0' },
      id: { type: ['string', 'integer', 'null'], description: 'Omit for a notification.' },
      method: { type: 'string', description: '`initialize`, `ping`, `tools/list` or `tools/call`.' },
      params: { type: 'object', additionalProperties: true },
    },
    required: ['jsonrpc', 'method'],
  },
  JsonRpcResponse: {
    type: 'object',
    properties: {
      jsonrpc: { type: 'string', const: '2.0' },
      id: { type: ['string', 'integer', 'null'] },
      result: { type: 'object', additionalProperties: true },
      error: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          message: { type: 'string' },
        },
        required: ['code', 'message'],
      },
    },
    required: ['jsonrpc'],
  },
} as const

const jsonResponse = (description: string, schema: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
})

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
})

const cssResponse = (description: string) => ({
  description,
  content: { 'text/css': { schema: { type: 'string' } } },
})

/**
 * The public HTTP surface as an OpenAPI 3.1 document.
 *
 * @param origin Absolute origin the API is reachable at.
 */
export function openApiDocument(origin = 'https://unifont.dev') {
  const base = origin.replace(/\/+$/, '')

  return {
    openapi: '3.1.0',
    info: {
      title: 'unifont.dev HTTP API',
      version: '1.0.0',
      summary: 'Font metadata from every major font CDN, through one API.',
      description: [
        'Read font metadata from Google Fonts, Bunny Fonts, Fontshare, Fontsource, Google Icons and npm through a single interface, powered by the `unifont` library.',
        '',
        'Use it to search a merged catalogue of families, see what a provider actually publishes for a family (weights, styles, subsets, unicode ranges), compare the same family across providers, check whether a family can draw a string, measure what a selection weighs, and get `@font-face` CSS you can ship.',
        '',
        'No authentication, no rate limit headers, no keys. Everything is a `GET` except the MCP endpoint. This is a best-effort public service rather than production infrastructure: if a deployment of yours depends on it, run `unifont` yourself. The `css` endpoints answer scripts and this site’s own pages, but refuse a `<link rel="stylesheet">` from another site.',
      ].join('\n'),
      contact: {
        name: 'unifont on GitHub',
        url: 'https://github.com/unjs/unifont',
      },
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: base, description: 'Production' }],
    externalDocs: { url: `${base}/api`, description: 'Human-readable API reference' },
    tags: [
      { name: 'catalogue', description: 'Search and list the merged family index.' },
      { name: 'families', description: 'What a provider publishes for one family.' },
      { name: 'css', description: 'Ready-to-serve `@font-face` stylesheets.' },
      { name: 'meta', description: 'Providers, service status and credits.' },
      { name: 'agents', description: 'Endpoints built for models and agents.' },
      { name: 'stacks', description: 'Stacks people publish from their own atproto accounts.' },
    ],
    paths: {
      '/api/v1/providers': {
        get: {
          operationId: 'listProviders',
          tags: ['meta'],
          summary: 'List every provider',
          description: 'Every provider unifont supports, with the number of families each one lists and whether it answered while the current index was built.',
          responses: {
            200: jsonResponse('Every provider, in cascade order.', 'ProvidersResponse'),
          },
        },
      },
      '/api/v1/status': {
        get: {
          operationId: 'getStatus',
          tags: ['meta'],
          summary: 'Service status',
          description: 'How the merged index is doing right now: family counts, which providers answered, and how old the index is.',
          responses: {
            200: jsonResponse('Current index state.', 'StatusResponse'),
          },
        },
      },
      '/api/v1/contributors': {
        get: {
          operationId: 'listContributors',
          tags: ['meta'],
          summary: 'List contributors',
          description: 'Everyone who has landed a commit in `unjs/unifont`, ranked by commit count.',
          responses: {
            200: jsonResponse('Contributors, most commits first.', 'ContributorsResponse'),
          },
        },
      },
      '/api/v1/fonts': {
        get: {
          operationId: 'searchFonts',
          tags: ['catalogue'],
          summary: 'Search the catalogue',
          description: 'Search the merged catalogue of families. Ranked exact, then prefix, then word, then substring. Never fuzzy, so a typo returns nothing rather than the wrong family.',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: false,
              description: 'What to search for. Omit to list everything.',
              schema: { type: 'string' },
              example: 'grotesk',
            },
            {
              name: 'provider',
              in: 'query',
              required: false,
              description: 'Limit results to one provider. `adobe` cannot list its families and is rejected.',
              schema: provider,
            },
            {
              name: 'variable',
              in: 'query',
              required: false,
              description: 'Keep only families publishing a weight range. A family whose provider publishes no properties is dropped by any filter.',
              schema: { type: 'boolean' },
            },
            {
              name: 'italic',
              in: 'query',
              required: false,
              description: 'Keep only families publishing an italic.',
              schema: { type: 'boolean' },
            },
            {
              name: 'subset',
              in: 'query',
              required: false,
              description: 'Keep only families covering this script, as `/api/v1/facets` names them.',
              schema: { type: 'string' },
              example: 'cyrillic',
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'How many families to return.',
              schema: { type: 'integer', minimum: 1, maximum: 200, default: 60 },
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              description: 'How many matches to skip.',
              schema: { type: 'integer', minimum: 0, default: 0 },
            },
          ],
          responses: {
            200: jsonResponse('Matching families.', 'FontsResponse'),
            400: errorResponse('Unknown provider, or a provider that cannot list its families.'),
          },
        },
      },
      '/api/v1/fonts/{family}': {
        get: {
          operationId: 'getFont',
          tags: ['families'],
          summary: 'Resolve one family',
          description: 'Everything a provider knows about a family, and the faces a selection resolves to, including `@font-face` CSS for it.',
          parameters: [
            familyParameter,
            ...selectionParameters,
            {
              name: 'formats',
              in: 'query',
              required: false,
              description: 'Font formats to resolve (comma-separated). Defaults to `woff2`.',
              schema: commaList('Comma-separated formats.'),
              example: 'woff2',
            },
          ],
          responses: {
            200: jsonResponse('The resolved family.', 'FontResponse'),
            400: errorResponse('No family was given.'),
            404: errorResponse('No provider publishes the family. It may still exist on Adobe Fonts, which cannot be listed.'),
          },
        },
      },
      '/api/v1/fonts/{family}/css': {
        get: {
          operationId: 'getFontCss',
          tags: ['css'],
          summary: 'Stylesheet for one family',
          description: '`@font-face` CSS for one family, to read, paste or fetch from a script. A selection that resolves to nothing returns an empty stylesheet with a comment, not an error. Linking it as a stylesheet from another site is refused: resolve the family with `unifont` and serve the CSS yourself.',
          parameters: [
            familyParameter,
            ...selectionParameters,
            {
              name: 'as',
              in: 'query',
              required: false,
              description: 'Rename the family in the output, so several providers can be loaded side by side.',
              schema: { type: 'string' },
              example: 'Switzer (bunny)',
            },
          ],
          responses: {
            200: cssResponse('The stylesheet.'),
            400: errorResponse('No family was given.'),
          },
        },
      },
      '/api/v1/css': {
        get: {
          operationId: 'getCatalogueCss',
          tags: ['css'],
          summary: 'Stylesheet for many families',
          description: 'One stylesheet for up to 40 families, so a grid of specimens costs a single request. A family that cannot be resolved becomes a comment rather than breaking the sheet.',
          parameters: [
            {
              name: 'families',
              in: 'query',
              required: true,
              description: 'Families to resolve (comma-separated, up to 40).',
              schema: commaList('Comma-separated family names.'),
              example: 'Anton,Erode,Spectral',
            },
            {
              name: 'weights',
              in: 'query',
              required: false,
              description: 'Weights to resolve (comma-separated). Defaults to the variable range, or the weight nearest 400.',
              schema: commaList('Comma-separated weights.'),
            },
            {
              name: 'subsets',
              in: 'query',
              required: false,
              description: 'Subsets to resolve (comma-separated). Defaults to `latin` where the family publishes it.',
              schema: commaList('Comma-separated subsets.'),
            },
            {
              name: 'preset',
              in: 'query',
              required: false,
              description: '`specimen` cuts each face to the characters this site’s grids set, which only Google honours. Omit it to receive faces that can set any text.',
              schema: { type: 'string', enum: ['specimen'] },
            },
          ],
          responses: {
            200: cssResponse('The stylesheet.'),
            400: errorResponse('`families` was missing or empty.'),
          },
        },
      },
      '/api/v1/facets': {
        get: {
          operationId: 'listFacets',
          tags: ['catalogue'],
          summary: 'What the catalogue can be filtered by',
          description: 'Counts for each filter the catalogue offers, so a caller knows what a filter would keep before applying it.',
          responses: {
            200: jsonResponse('Filter counts.', 'FacetsResponse'),
          },
        },
      },
      '/api/v1/transfer': {
        get: {
          operationId: 'getBaselineTransferSizes',
          tags: ['catalogue'],
          summary: 'Transfer size for many families',
          description: 'Bytes on the wire for up to 40 families, all quoted against one selection (400 and 700, latin, woff2) so that two families are compared on the same terms. Measured with HEAD requests, so nothing is downloaded.',
          parameters: [
            {
              name: 'families',
              in: 'query',
              required: true,
              description: 'Families to measure (comma-separated, up to 40).',
              schema: commaList('Comma-separated family names.'),
              example: 'Anton,Erode,Spectral',
            },
          ],
          responses: {
            200: jsonResponse('Measured transfer sizes.', 'BaselineTransferResponse'),
            400: errorResponse('`families` was missing or empty.'),
          },
        },
      },
      '/api/v1/fonts/{family}/fallback': {
        get: {
          operationId: 'getFontFallback',
          tags: ['families'],
          summary: 'Metric-matched fallback for one family',
          description: 'A `@font-face` that makes a generic match this family’s metrics, so a page does not reflow when the real font lands. Metrics are read from the served file, and the face points at families a system may actually have rather than at the generic itself, which resolves nowhere.',
          parameters: [
            familyParameter,
            {
              name: 'provider',
              in: 'query',
              required: false,
              description: 'Limit the cascade to these providers (comma-separated).',
              schema: commaList('Comma-separated provider names.'),
            },
          ],
          responses: {
            200: jsonResponse('The generated face and its descriptors.', 'FallbackResponse'),
            400: errorResponse('No family was given.'),
            404: errorResponse('No provider could resolve this family.'),
          },
        },
      },
      '/api/v1/fonts/{family}/budget': {
        get: {
          operationId: 'getTextBudget',
          tags: ['families'],
          summary: 'What one string costs in this family',
          description: 'Prices a string three ways against the same family: every file the selection publishes, only the files the text pulls through `unicode-range`, and, for a provider that subsets to a glyph list, the subset. For a family split into a hundred subset files the three differ by orders of magnitude.',
          parameters: [
            familyParameter,
            {
              name: 'text',
              in: 'query',
              required: true,
              description: 'The string to price. Whitespace is collapsed, and it is capped at 64 characters.',
              schema: { type: 'string' },
              example: 'Acme Corp',
            },
            {
              name: 'weights',
              in: 'query',
              required: false,
              description: 'Weights to price (comma-separated). Default 400.',
              schema: commaList('Comma-separated weights.'),
            },
            {
              name: 'styles',
              in: 'query',
              required: false,
              description: 'Styles to price (comma-separated). Default normal.',
              schema: commaList('Comma-separated styles.'),
            },
            {
              name: 'provider',
              in: 'query',
              required: false,
              description: 'Limit the cascade to these providers (comma-separated).',
              schema: commaList('Comma-separated provider names.'),
            },
          ],
          responses: {
            200: jsonResponse('The three plans, measured the same way.', 'BudgetResponse'),
            400: errorResponse('No family, or no `text` to price.'),
            404: errorResponse('No provider knows this family, or none could resolve the selection.'),
          },
        },
      },
      '/api/v1/fonts/{family}/compare': {
        get: {
          operationId: 'compareFontProviders',
          tags: ['families'],
          summary: 'Compare providers for one family',
          description: 'Ask every provider that needs no credentials for the same family, and see how the answers differ: weights, styles, subsets, file counts and transfer size.',
          parameters: [familyParameter],
          responses: {
            200: jsonResponse('One row per provider.', 'CompareResponse'),
            400: errorResponse('No family was given.'),
          },
        },
      },
      '/api/v1/fonts/{family}/coverage': {
        get: {
          operationId: 'getFontCoverage',
          tags: ['families'],
          summary: 'Unicode coverage for one family',
          description: 'Which characters the resolved faces can actually draw, based on their `unicode-range`. Checks a set of built-in samples, or your own string.',
          parameters: [
            familyParameter,
            providerScope,
            {
              name: 'text',
              in: 'query',
              required: false,
              description: 'Check this text instead of the built-in samples.',
              schema: { type: 'string' },
              example: 'Zażółć gęślą jaźń',
            },
          ],
          responses: {
            200: jsonResponse('Coverage per sample.', 'CoverageResponse'),
            400: errorResponse('No family was given.'),
            404: errorResponse('No provider publishes the family.'),
          },
        },
      },
      '/api/v1/fonts/{family}/transfer': {
        get: {
          operationId: 'getFontTransferSize',
          tags: ['families'],
          summary: 'Transfer size of a selection',
          description: 'How much a selection weighs, measured with `HEAD` requests against the provider CDN. No font file is downloaded.',
          parameters: [familyParameter, ...selectionParameters],
          responses: {
            200: jsonResponse('Measured transfer size.', 'TransferResponse'),
            400: errorResponse('No family was given.'),
            404: errorResponse('No provider publishes the family.'),
          },
        },
      },
      '/api/v1/fonts/{family}/stacks': {
        get: {
          operationId: 'listStacksUsingFamily',
          tags: ['stacks'],
          summary: 'Stacks that use one family',
          description: 'Every published stack with this family in any role, found by asking a backlink index which records point at the family’s canonical page.',
          parameters: [familyParameter],
          responses: {
            200: jsonResponse('Stacks using the family.', 'StacksResponse'),
            400: errorResponse('No family was given.'),
          },
        },
      },
      '/api/v1/stacks': {
        get: {
          operationId: 'listStacks',
          tags: ['stacks'],
          summary: 'Stacks published on the network',
          description: 'Stacks anyone has published as `dev.unifont.stack` records, newest first. Found through the constellation backlink index, then read from the account that owns each one. Nothing is stored here.',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Up to 100. Default 24.',
              schema: { type: 'integer', minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            200: jsonResponse('Recently published stacks.', 'StacksResponse'),
          },
        },
      },
      '/api/v1/stacks/{handle}': {
        get: {
          operationId: 'listStacksByAuthor',
          tags: ['stacks'],
          summary: 'Stacks one person has published',
          description: 'Read straight from that account, so it is complete whether or not any index knows about them.',
          parameters: [
            { name: 'handle', in: 'path', required: true, description: 'A handle or a DID.', schema: { type: 'string' }, example: 'danielroe.dev' },
          ],
          responses: {
            200: jsonResponse('Their stacks.', 'StacksResponse'),
            404: errorResponse('No account answers to that handle.'),
          },
        },
      },
      '/api/v1/stacks/{handle}/{rkey}': {
        get: {
          operationId: 'getStack',
          tags: ['stacks'],
          summary: 'One stack',
          description: 'One published stack, read from the account that owns it rather than from any index.',
          parameters: [
            { name: 'handle', in: 'path', required: true, description: 'A handle or a DID.', schema: { type: 'string' } },
            { name: 'rkey', in: 'path', required: true, description: 'The record key.', schema: { type: 'string' } },
          ],
          responses: {
            200: jsonResponse('The stack, with its author.', 'StacksResponse'),
            404: errorResponse('No such record.'),
          },
        },
      },
      '/mcp': {
        post: {
          operationId: 'callMcp',
          tags: ['agents'],
          summary: 'Model Context Protocol endpoint',
          description: 'MCP server over Streamable HTTP. Tools: `search_fonts`, `get_font`, `get_font_css`, `compare_providers`, `check_coverage`, `list_providers`. Add it with `claude mcp add --transport http unifont https://unifont.dev/mcp`.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcRequest' } } },
          },
          responses: {
            200: jsonResponse('A JSON-RPC 2.0 response. A notification is answered with `202` and no body.', 'JsonRpcResponse'),
            202: { description: 'A notification was accepted.' },
            400: errorResponse('The body was not a JSON-RPC 2.0 request.'),
          },
        },
      },
    },
    components: { schemas },
  }
}

export type OpenApiDocument = ReturnType<typeof openApiDocument>
