<script setup lang="ts">
usePageSeo({
  title: 'HTTP API',
  description: 'Every page on unifont.dev is also an HTTP endpoint: search, metadata, CSS, provider comparison and unicode coverage.',
})

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  summary: string
  params?: { name: string, type: string, note: string }[]
  example: string
  returns: string
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/providers',
    summary: 'Every provider, with the number of families it will list.',
    example: 'curl https://unifont.dev/api/v1/providers',
    returns: '{ providers: [{ name, label, origin, families, requiresOptions, unavailable, note }] }',
  },
  {
    method: 'POST',
    path: '/mcp',
    summary: 'MCP server over Streamable HTTP. Point an agent at it and it can search families, read provider metadata, compare CDNs, check unicode coverage, and get CSS it can paste.',
    example: 'claude mcp add --transport http unifont https://unifont.dev/mcp',
    returns: 'JSON-RPC 2.0. Tools: search_fonts · get_font · get_font_css · compare_providers · check_coverage · list_providers',
  },
  {
    method: 'GET',
    path: '/api/v1/status',
    summary: 'How the merged index is doing right now: family counts, which providers answered, and how old the index is.',
    example: 'curl https://unifont.dev/api/v1/status',
    returns: '{ families, providers, unavailable, indexAge, crossListed }',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts',
    summary: 'Search the merged catalogue. Ranked exact → prefix → word → substring. Never fuzzy.',
    params: [
      { name: 'q', type: 'string', note: 'What to search for. Leave it out to list everything.' },
      { name: 'provider', type: 'string', note: 'Limit to one provider.' },
      { name: 'limit', type: 'number', note: 'Default 60, capped at 200.' },
      { name: 'offset', type: 'number', note: 'Default 0.' },
    ],
    example: 'curl "https://unifont.dev/api/v1/fonts?q=grotesk&limit=5"',
    returns: '{ total, families: [{ family, providers }], unavailable }',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts/{family}',
    summary: 'Everything one provider knows about a family, and the faces it resolves to.',
    params: [
      { name: 'provider', type: 'string', note: 'Limit the cascade to these providers (comma-separated).' },
      { name: 'weights', type: 'string', note: 'Comma-separated. Defaults to every weight published.' },
      { name: 'styles', type: 'string', note: 'Comma-separated: normal, italic, oblique.' },
      { name: 'subsets', type: 'string', note: 'Comma-separated. Defaults to everything published.' },
    ],
    example: 'curl "https://unifont.dev/api/v1/fonts/Newsreader?weights=400,600&subsets=latin"',
    returns: '{ family, provider, providers, properties, requested, notes, fonts, fallbacks, css }',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts/{family}/transfer',
    summary: 'How much a selection weighs, measured with HEAD requests. Nothing is downloaded.',
    params: [
      { name: 'weights', type: 'string', note: 'Comma-separated. Default 400.' },
      { name: 'styles', type: 'string', note: 'Comma-separated. Default normal.' },
      { name: 'subsets', type: 'string', note: 'Comma-separated. Default latin.' },
      { name: 'provider', type: 'string', note: 'Limit the cascade to these providers (comma-separated).' },
    ],
    example: 'curl "https://unifont.dev/api/v1/fonts/Fraunces/transfer?subsets=latin,latin-ext"',
    returns: '{ family, faces, files, measured, bytes }. `measured` counts the files that reported a content-length',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts/{family}/css',
    summary: '@font-face CSS you can serve. Link to it directly, or read it and copy. If a selection resolves to nothing you get an empty stylesheet with a comment, not a 404.',
    params: [
      { name: 'provider', type: 'string', note: 'Limit the cascade to these providers (comma-separated).' },
      { name: 'weights', type: 'string', note: 'Comma-separated. Default 400.' },
      { name: 'styles', type: 'string', note: 'Comma-separated. Default normal.' },
      { name: 'subsets', type: 'string', note: 'Comma-separated. Default latin.' },
      { name: 'as', type: 'string', note: 'Rename the family, so you can load several providers at once.' },
    ],
    example: 'curl "https://unifont.dev/api/v1/fonts/Switzer/css?weights=300,500"',
    returns: 'text/css',
  },
  {
    method: 'GET',
    path: '/api/v1/css',
    summary: 'One stylesheet for lots of families, so a grid of specimens costs one request.',
    params: [
      { name: 'families', type: 'string', note: 'Comma-separated, up to 40. Required.' },
      { name: 'weights', type: 'string', note: 'Comma-separated. Defaults to the variable range, or the weight nearest 400.' },
      { name: 'subsets', type: 'string', note: 'Comma-separated. Defaults to latin where the family publishes it.' },
    ],
    example: 'curl "https://unifont.dev/api/v1/css?families=Anton,Erode,Spectral"',
    returns: 'text/css. A family that can\'t be resolved becomes a comment, rather than breaking the sheet',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts/{family}/compare',
    summary: 'The same family, asked of every provider that doesn\'t need credentials.',
    example: 'curl https://unifont.dev/api/v1/fonts/Inter/compare',
    returns: '{ family, results: [{ provider, available, weights, styles, subsets, faces, files, host, fallbacks }] }',
  },
  {
    method: 'GET',
    path: '/api/v1/fonts/{family}/coverage',
    summary: 'Which characters the resolved faces can actually draw, based on their unicode-range.',
    params: [
      { name: 'text', type: 'string', note: 'Check your own text instead of the built-in samples.' },
      { name: 'provider', type: 'string', note: 'Limit the cascade to these providers (comma-separated).' },
    ],
    example: 'curl "https://unifont.dev/api/v1/fonts/Anton/coverage?text=Zażółć"',
    returns: '{ family, provider, checks: { [name]: { text, unrestricted, covered, missing, subsets } } }',
  },
]

const anchor = (path: string) => path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
</script>

<template>
  <div class="api">
    <header class="head">
      <h1 class="head__title">
        The site is an API
      </h1>
      <p class="head__lede">
        Every page here is a thin layer over these endpoints. They're public, they need no auth, they're
        cached, and they won't change while they're under <code>/v1</code>. Use them in scripts, editor
        plugins or CI checks, anywhere you want font metadata without shipping a resolver. There's an
        <a href="https://modelcontextprotocol.io">MCP</a> server too, if the thing asking is a model.
      </p>
      <p class="head__machine">
        Machine-readable: <a href="/openapi.json">openapi.json</a> describes every endpoint below,
        <a href="/llms.txt">llms.txt</a> indexes the site for agents, and every prose page here answers in
        markdown if you ask for <code>text/markdown</code> or append <code>.md</code> to its path.
      </p>
      <p class="head__warn">
        Not for production use. This API is best-effort, we'll rate-limit it if we have to, and it can
        change or go away, the same as <code>proxy.unifont.dev</code>. Build it into a script, an editor
        plugin or a CI check by all means; if a deployment of yours depends on it, run
        <code>unifont</code> yourself instead, or
        <a href="https://github.com/unjs/unifont/tree/main/proxy">self-host the proxy</a>.
      </p>
    </header>

    <nav
      class="toc"
      aria-label="Endpoints"
    >
      <ul class="toc__list">
        <li
          v-for="endpoint in endpoints"
          :key="endpoint.path"
        >
          <a
            class="toc__link"
            :href="`#${anchor(endpoint.path)}`"
          >{{ endpoint.path }}</a>
        </li>
      </ul>
    </nav>

    <section
      v-for="endpoint in endpoints"
      :id="anchor(endpoint.path)"
      :key="endpoint.path"
      class="endpoint"
    >
      <h2 class="endpoint__path">
        <span class="endpoint__method">{{ endpoint.method }}</span>
        {{ endpoint.path }}
      </h2>
      <p class="endpoint__summary">
        {{ endpoint.summary }}
      </p>

      <table
        v-if="endpoint.params"
        class="params"
      >
        <thead>
          <tr>
            <th scope="col">
              Parameter
            </th>
            <th scope="col">
              Type
            </th>
            <th scope="col">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="param in endpoint.params"
            :key="param.name"
          >
            <th scope="row">
              <code>{{ param.name }}</code>
            </th>
            <td class="params__type">
              {{ param.type }}
            </td>
            <td>{{ param.note }}</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        :code="endpoint.example"
        label="example"
        language="bash"
      />

      <p class="endpoint__returns">
        <span class="endpoint__returns-label">returns</span>
        <code>{{ endpoint.returns }}</code>
      </p>
    </section>

    <section class="notes">
      <h2 class="notes__title">
        Conventions
      </h2>
      <dl class="notes__list">
        <div class="notes__row">
          <dt>Family names</dt>
          <dd>
            Percent-encode them: <code>/api/v1/fonts/Big%20Shoulders%20Display</code>. Matching ignores
            case.
          </dd>
        </div>
        <div class="notes__row">
          <dt>Unknown families</dt>
          <dd>
            <code>404</code> with a message naming the family. A family may still exist on Adobe Fonts or npm,
            neither of which can be listed from here.
          </dd>
        </div>
        <div class="notes__row">
          <dt>Partial answers</dt>
          <dd>
            If a provider fails, the response says so in <code>unavailable</code>, rather than quietly
            handing you a short list.
          </dd>
        </div>
        <div class="notes__row">
          <dt>Caching</dt>
          <dd>
            Metadata is cached for an hour and CSS for a day, both with
            <code>stale-while-revalidate</code>. Font files come from the provider's own CDN. This API never
            proxies them.
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.api {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  max-width: calc(20 * var(--char));
  font-size: var(--text-display-s);
  letter-spacing: -0.03em;
}

.head__lede {
  max-width: var(--measure);
  margin-top: var(--space-sm);
  color: var(--color-muted);
}

.head__machine {
  max-width: var(--measure);
  margin-top: var(--space-sm);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.head__warn {
  max-width: var(--measure);
  margin-top: var(--space-md);
  padding-left: var(--space-md);
  border-left: var(--rule-heavy) solid var(--color-warning);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.toc {
  padding-block: var(--space-lg);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.toc__list {
  display: flex;
  gap: var(--space-xs) var(--space-lg);
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Standalone links, so they take the WCAG 2.2 2.5.8 minimum rather than the inline exception. */
.toc__link {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-decoration: none;
  border-bottom: var(--rule-hair) solid var(--color-rule);
  white-space: nowrap;
}

.toc__link:hover {
  border-bottom-color: var(--color-ink);
  color: var(--color-ink);
}

.endpoint {
  padding-block: var(--space-2xl) var(--space-xl);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  scroll-margin-top: 5rem;
}

.endpoint__path {
  display: flex;
  gap: var(--space-sm);
  align-items: baseline;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: 500;
  letter-spacing: 0;
}

.endpoint__method {
  color: var(--color-neutral);
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
}

.endpoint__summary {
  max-width: var(--measure);
  margin-block: var(--space-sm) var(--space-lg);
  color: var(--color-muted);
}

.params {
  width: 100%;
  margin-bottom: var(--space-lg);
  border-collapse: collapse;
  font-size: var(--text-sm);
  text-align: left;
}

.params thead th {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: var(--rule-hair) solid var(--color-rule-strong);
  color: var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-body-strong);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.params tbody th,
.params td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-weight: var(--weight-body);
  vertical-align: top;
}

.params tbody th {
  white-space: nowrap;
}

.params__type {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.endpoint__returns {
  display: flex;
  gap: var(--space-sm);
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: var(--space-md);
  font-size: var(--text-sm);
}

.endpoint__returns-label {
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.endpoint__returns code {
  color: var(--color-muted);
  overflow-wrap: anywhere;
}

.notes {
  padding-block: var(--space-2xl);
}

.notes__title {
  margin-bottom: var(--space-lg);
  font-size: var(--text-lg);
}

.notes__row {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
  gap: var(--space-2xs) var(--space-xl);
  padding-block: var(--space-md);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.notes__row dt {
  font-family: var(--font-display);
  font-size: var(--text-md);
}

.notes__row dd {
  margin: 0;
  max-width: var(--measure);
  color: var(--color-muted);
}

@media (width < 60rem) {
  .notes__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
