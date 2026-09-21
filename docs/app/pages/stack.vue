<script setup lang="ts">
import { familyUri, STACK_APP_URI } from '#shared/atproto'
import { nearestWeight } from '#shared/weights'

const route = useRoute()
const router = useRouter()

/**
 * The weights this page sets, at the site's own scale. Body carries emphasis, so it alone needs a
 * bold and an italic; nothing else is asked for.
 */
const ROLES = [
  { key: 'heading', label: 'Heading', fallback: 'var(--font-display)', targets: [600], styles: ['normal'] },
  { key: 'body', label: 'Body', fallback: 'var(--font-body)', targets: [350, 700], styles: ['normal', 'italic'] },
  { key: 'mono', label: 'Mono', fallback: 'var(--font-mono)', targets: [400], styles: ['normal'] },
] as const

type Role = typeof ROLES[number]['key']

const stack = computed(() => Object.fromEntries(
  ROLES.map(role => [role.key, String(route.query[role.key] ?? '').trim()]),
) as Record<Role, string>)

const chosen = computed(() => ROLES.map(role => ({ ...role, family: stack.value[role.key] })).filter(role => role.family))

function setRole(key: Role, value: string) {
  router.replace({ query: { ...route.query, [key]: value.trim() || undefined } })
}

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

useProviderPreconnect()

usePageSeo({
  title: () => (families.value.length ? `Stack: ${families.value.join(' + ')}` : 'Stack'),
  description: 'Set a heading, body and mono face side by side and take the config away.',
})

const MONO_SAMPLE = 'const stack = { heading: 0.1, body: 1.0, mono: 0.3 } // 1234567890'

function stackFor(role: typeof ROLES[number]) {
  const family = stack.value[role.key]
  return family ? `'${family}', ${role.fallback}` : role.fallback
}

/* ── Publishing ───────────────────────────────────────── */
const { session, signIn, signOut } = useAtprotoSession()

const handleInput = ref('')
const publishing = ref(false)
const published = ref<{ handle: string, rkey: string } | null>(null)
const failure = ref('')
const title = ref('')

async function startSignIn() {
  failure.value = ''
  try {
    await signIn(handleInput.value)
  }
  catch (error) {
    failure.value = error instanceof Error ? error.message : 'That handle did not resolve.'
  }
}

async function publish() {
  const signedIn = session.value
  if (!signedIn) {
    return
  }

  publishing.value = true
  failure.value = ''
  try {
    const { rkey } = await signedIn.airspace.stacks.create({
      title: (title.value.trim() || families.value.join(' + ')).slice(0, 120),
      roles: chosen.value.map(role => ({ role: role.key, family: role.family, uri: familyUri(role.family) })),
      app: STACK_APP_URI,
      createdAt: new Date().toISOString(),
    })
    published.value = { handle: signedIn.handle, rkey }
  }
  catch (error) {
    failure.value = error instanceof Error ? error.message : 'That did not work.'
  }
  finally {
    publishing.value = false
  }
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
  <div class="stack">
    <header class="head">
      <h1 class="head__title">
        Stack
      </h1>
      <p class="head__lede">
        Choose any three families to describe a font stack &ndash; and then, if you want, you can share the URL or publish the stack.
      </p>

      <div class="picker">
        <FamilyCombobox
          v-for="role in ROLES"
          :id="`role-${role.key}`"
          :key="role.key"
          :label="role.label"
          :model-value="stack[role.key]"
          placeholder="Search the catalogue"
          @update:model-value="setRole(role.key, $event)"
        />
      </div>

      <p
        v-if="!families.length"
        class="head__count"
      >
        Name a family for any role to start. A stack of one is fine.
      </p>
    </header>

    <section
      v-if="chosen.length"
      class="composition"
      aria-label="Preview"
    >
      <p
        class="composition__label"
        :style="{ fontFamily: stackFor(ROLES[2]), fontWeight: setWeights.mono?.[0] }"
      >
        preview
      </p>
      <h2
        class="composition__heading"
        :style="{ fontFamily: stackFor(ROLES[0]), fontWeight: setWeights.heading?.[0] }"
      >
        Words set in your very own font stack
      </h2>
      <p
        class="composition__body"
        :style="{
          'fontFamily': stackFor(ROLES[1]),
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
        :family="stackFor(ROLES[2])"
        :weight="setWeights.mono?.[0]"
      />
    </section>

    <section
      v-if="chosen.length"
      class="roles"
    >
      <p
        v-for="role in chosen"
        :key="role.key"
        class="roles__row"
      >
        <span class="roles__label">{{ role.label }}</span>
        <NuxtLink :to="`/fonts/${encodeURIComponent(role.family)}`">
          {{ role.family }}
        </NuxtLink>
      </p>
    </section>

    <CodeBlock
      v-if="snippet"
      :code="snippet"
      label="resolve the stack"
      language="typescript"
    />

    <section
      v-if="chosen.length"
      class="publish"
      aria-labelledby="publish-heading"
    >
      <h2
        id="publish-heading"
        class="publish__title"
      >
        Keep this stack
      </h2>

      <p
        v-if="published"
        class="publish__lede"
      >
        Published to your account.
        <NuxtLink :to="`/stacks/@${published.handle}/${published.rkey}`">
          See it
        </NuxtLink>, or find it among
        <NuxtLink to="/stacks">
          everyone else’s
        </NuxtLink>.
      </p>

      <template v-else-if="session">
        <p class="publish__lede">
          Signed in as @{{ session.handle }}. Publishing saves this stack to your own account, from
          your browser. You can delete it here or anywhere else you reach that account.
        </p>
        <p class="publish__row">
          <label class="publish__field">
            <span>Title</span>
            <input
              v-model="title"
              class="publish__input"
              type="text"
              maxlength="120"
              :placeholder="families.join(' + ')"
            >
          </label>
          <button
            class="publish__button"
            type="button"
            :disabled="publishing"
            @click="publish()"
          >
            {{ publishing ? 'publishing…' : 'publish to my account' }}
          </button>
          <button
            class="publish__button"
            type="button"
            @click="signOut()"
          >
            sign out
          </button>
        </p>
      </template>

      <template v-else>
        <p class="publish__lede">
          Sign in with an atmosphere account to publish this stack.
        </p>
        <p class="publish__row">
          <label class="publish__field">
            <span>Handle</span>
            <input
              v-model="handleInput"
              class="publish__input"
              type="text"
              autocomplete="username"
              spellcheck="false"
              placeholder="you.bsky.social"
            >
          </label>
          <button
            class="publish__button"
            type="button"
            :disabled="!handleInput.trim()"
            @click="startSignIn()"
          >
            sign in
          </button>
        </p>
      </template>

      <p
        v-if="failure"
        class="publish__error"
        role="alert"
      >
        {{ failure }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.stack {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}

.head {
  padding-block: var(--space-xl) var(--space-lg);
  border-bottom: var(--rule-heavy) solid var(--color-ink);
}

.head__title {
  font-size: var(--text-2xl);
}

.head__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.picker {
  display: grid;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

@media (width >= 48rem) {
  .picker {
    grid-template-columns: repeat(3, 1fr);
  }
}

.head__count {
  margin-top: var(--space-md);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

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

.publish {
  padding-block: var(--space-xl);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.publish__title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-neutral);
}

.publish__lede {
  max-width: var(--measure);
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.publish__row {
  display: flex;
  gap: var(--space-sm);
  align-items: end;
  flex-wrap: wrap;
  margin-top: var(--space-md);
}

.publish__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  color: var(--color-neutral);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.publish__input {
  inline-size: min(20rem, 60vw);
  padding: var(--space-2xs) 0;
  background: none;
  border: 0;
  border-bottom: var(--rule-hair) solid var(--color-neutral);
  font-family: var(--font-body);
  font-size: var(--text-sm);
}

.publish__button {
  min-height: 2.25rem;
  padding: var(--space-2xs) var(--space-sm);
  background: none;
  border: var(--rule-hair) solid var(--color-rule);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
}

.publish__button:disabled {
  cursor: default;
  opacity: 0.6;
}

.publish__error {
  margin-top: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
