<script setup lang="ts">
import type { StackRole } from '#shared/types'
import { nearestWeight } from '#shared/weights'

const props = defineProps<{ roles: Pick<StackRole, 'role' | 'family'>[] }>()

/**
 * The weights this preview sets, at the site's own scale. Body carries emphasis, so it alone needs
 * a bold and an italic; nothing else is asked for.
 */
const ROLES = [
  { key: 'heading', fallback: 'var(--font-display)', targets: [600], styles: ['normal'] },
  { key: 'body', fallback: 'var(--font-body)', targets: [350, 700], styles: ['normal', 'italic'] },
  { key: 'mono', fallback: 'var(--font-mono)', targets: [400], styles: ['normal'] },
] as const

type Role = typeof ROLES[number]['key']

const MONO_SAMPLE = 'const stack = { heading: 0.1, body: 1.0, mono: 0.3 } // 1234567890'

const familyFor = (key: Role) => props.roles.find(role => role.role === key)?.family ?? ''

const chosen = computed(() => ROLES.map(role => ({ ...role, family: familyFor(role.key) })).filter(role => role.family))

const families = computed(() => chosen.value.map(role => role.family))

/** A provider serves nothing for a weight it does not publish, so the targets are asked of it. */
const { data: availableWeights } = await useAsyncData(
  () => `stack-weights-${families.value.join('|')}`,
  async () => Object.fromEntries(await Promise.all(families.value.map(async family => [
    family,
    await $fetch(`/api/v1/fonts/${encodeURIComponent(family)}`)
      .then(data => data.properties?.weights ?? [])
      .catch(() => [] as string[]),
  ] as const))),
  { default: () => ({} as Record<string, string[]>), watch: [families] },
)

/** A variable face covers every target at once; a family of static cuts answers one at a time. */
function weightsFor(role: typeof chosen.value[number]) {
  const available = availableWeights.value?.[role.family] ?? []
  const range = available.find(weight => weight.includes(' '))
  if (range) {
    return { request: [range], set: role.targets.map(String) }
  }
  const statics = available.filter(weight => !weight.includes(' '))
  const set = role.targets.map(target => (statics.length ? nearestWeight(statics, target) : String(target)))
  return { request: [...new Set(set)], set }
}

/** One sheet per role: each face is asked for at the weights and styles the preview sets. */
const stylesheets = computed(() => chosen.value.map(role =>
  `/api/v1/fonts/${encodeURIComponent(role.family)}/css`
  + `?weights=${encodeURIComponent(weightsFor(role).request.join(','))}&styles=${role.styles.join(',')}`,
))

useHead(() => ({ link: stylesheets.value.map(href => ({ rel: 'stylesheet', href })) }))

/** The weights the preview sets, so nothing is drawn in a face the page did not ask for. */
const setWeights = computed(() => Object.fromEntries(
  chosen.value.map(role => [role.key, weightsFor(role).set]),
) as Partial<Record<Role, string[]>>)

function stackFor(key: Role) {
  const role = ROLES.find(entry => entry.key === key)!
  const family = familyFor(key)
  return family ? `'${family}', ${role.fallback}` : role.fallback
}

const snippet = computed(() => {
  if (!chosen.value.length) {
    return ''
  }
  const options = (role: typeof chosen.value[number]) => [
    `weights: [${weightsFor(role).set.map(weight => `'${weight}'`).join(', ')}]`,
    ...(role.styles.length > 1 ? [`styles: [${role.styles.map(style => `'${style}'`).join(', ')}]`] : []),
  ].join(', ')

  return [
    `import { createUnifont, providers } from 'unifont'`,
    ``,
    `const unifont = await createUnifont([providers.google(), providers.fontshare(), providers.bunny()])`,
    ``,
    ...chosen.value.map(role => `const ${role.key} = await unifont.resolveFont('${role.family}', { ${options(role)} })`),
  ].join('\n')
})
</script>

<template>
  <div>
    <section
      class="composition"
      aria-label="Preview"
    >
      <p
        class="composition__label"
        :style="{ fontFamily: stackFor('mono'), fontWeight: setWeights.mono?.[0] }"
      >
        preview
      </p>
      <h2
        class="composition__heading"
        :style="{ fontFamily: stackFor('heading'), fontWeight: setWeights.heading?.[0] }"
      >
        Words set in your very own font stack
      </h2>
      <p
        class="composition__body"
        :style="{
          'fontFamily': stackFor('body'),
          'fontWeight': setWeights.body?.[0],
          '--strong-weight': setWeights.body?.[1],
        }"
      >
        A page is <em>mostly</em> body text, so the font face that matters the most is the one you look at least.
        It's amazing how small changes make a big difference to the impression you get of a page.
        Read this paragraph, then check the <strong>monospace text</strong> below.
      </p>
      <CodeBlock
        class="composition__mono"
        :code="MONO_SAMPLE"
        label="mono"
        language="typescript"
        :family="stackFor('mono')"
        :weight="setWeights.mono?.[0]"
      />
    </section>

    <section class="roles">
      <p
        v-for="role in chosen"
        :key="role.key"
        class="roles__row"
      >
        <span class="roles__label">{{ role.key }}</span>
        <NuxtLink :to="`/fonts/${encodeURIComponent(role.family)}`">
          {{ role.family }}
        </NuxtLink>
      </p>
    </section>

    <CodeBlock
      :code="snippet"
      label="resolve the stack"
      language="typescript"
    />
  </div>
</template>

<style scoped>
.composition {
  margin-block: var(--space-xl);
  padding: var(--space-lg);
  border: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper-2);
}

.composition__label {
  margin-bottom: var(--space-md);
  color: var(--color-muted);
  font-size: var(--text-xs);
}

.composition__heading {
  font-size: var(--text-2xl);
}

.composition__body {
  max-width: var(--measure);
  margin-top: var(--space-md);
  font-size: var(--text-base);
  line-height: 1.6;
}

.composition__body strong {
  font-weight: var(--strong-weight, 700);
}

.composition__mono {
  margin-top: var(--space-lg);
  background: var(--color-paper);
}

.roles {
  padding-block: var(--space-md);
}

.roles__row {
  display: grid;
  grid-template-columns: 6rem 1fr;
  gap: var(--space-sm);
  padding-block: var(--space-2xs);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.roles__label {
  color: var(--color-neutral);
}
</style>
