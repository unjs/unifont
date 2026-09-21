<script setup lang="ts">
import { familyUri, STACK_APP_URI } from '#shared/atproto'

const route = useRoute()
const router = useRouter()

/**
 * The weights this page sets, at the site's own scale. Body carries emphasis, so it alone needs a
 * bold and an italic; nothing else is asked for.
 */
const ROLES = [
  { key: 'heading', label: 'Heading' },
  { key: 'body', label: 'Body' },
  { key: 'mono', label: 'Mono' },
] as const

type Role = typeof ROLES[number]['key']

const stack = computed(() => Object.fromEntries(
  ROLES.map(role => [role.key, String(route.query[role.key] ?? '').trim()]),
) as Record<Role, string>)

const chosen = computed(() => ROLES.map(role => ({ ...role, family: stack.value[role.key] })).filter(role => role.family))

const roles = computed(() => chosen.value.map(role => ({ role: role.key, family: role.family })))

function setRole(key: Role, value: string) {
  router.replace({ query: { ...route.query, [key]: value.trim() || undefined } })
}

const families = computed(() => chosen.value.map(role => role.family))

useProviderPreconnect()

usePageSeo({
  title: () => (families.value.length ? `Stack: ${families.value.join(' + ')}` : 'Stack'),
  description: 'Set a heading, body and mono face side by side and take the config away.',
})

/* ── Publishing ───────────────────────────────────────── */
const { session, signIn, signOut } = useAtprotoSession()

const handleInput = ref('')
const publishing = ref(false)
const published = ref<{ handle: string, rkey: string } | null>(null)
const failure = ref('')
const title = ref('')

/** The record being edited, if the builder was opened from one. */
const rkey = computed(() => String(route.query.rkey ?? '').trim())

/** Kept so an edit does not rewrite when the stack was first made. */
const createdAt = ref('')

/** The redirect lands on a bare `/stack`, so the stack being built is parked before leaving. */
const DRAFT = 'unifont-stack-draft'

async function startSignIn() {
  failure.value = ''
  try {
    sessionStorage.setItem(DRAFT, JSON.stringify({ query: route.query, title: title.value }))
    await signIn(handleInput.value)
  }
  catch (error) {
    sessionStorage.removeItem(DRAFT)
    failure.value = error instanceof Error ? error.message : 'That handle did not resolve.'
  }
}

onMounted(() => {
  const draft = sessionStorage.getItem(DRAFT)
  sessionStorage.removeItem(DRAFT)
  if (!draft || families.value.length) {
    return
  }
  try {
    const { query, title: parked } = JSON.parse(draft) as { query: Record<string, string>, title: string }
    title.value = parked
    router.replace({ query })
  }
  catch {
    failure.value = ''
  }
})

/** An edit reads the record back, so a title left out of the URL survives the round trip. */
watch([rkey, session], async () => {
  if (!rkey.value || !session.value) {
    return
  }
  const record = await $fetch(`/api/v1/stacks/@${session.value.handle}/${encodeURIComponent(rkey.value)}`).catch(() => null)
  if (!record) {
    return
  }
  createdAt.value = record.stack.createdAt
  title.value ||= record.stack.title
}, { immediate: true })

async function publish() {
  const signedIn = session.value
  if (!signedIn) {
    return
  }

  publishing.value = true
  failure.value = ''
  const record = {
    title: (title.value.trim() || families.value.join(' + ')).slice(0, 120),
    roles: chosen.value.map(role => ({ role: role.key, family: role.family, uri: familyUri(role.family) })),
    app: STACK_APP_URI,
    createdAt: createdAt.value || new Date().toISOString(),
  }

  try {
    if (rkey.value) {
      await signedIn.airspace.stacks.put(rkey.value, record)
      published.value = { handle: signedIn.handle, rkey: rkey.value }
    }
    else {
      const written = await signedIn.airspace.stacks.create(record)
      published.value = { handle: signedIn.handle, rkey: written.rkey }
    }
  }
  catch (error) {
    failure.value = error instanceof Error ? error.message : 'That did not work.'
  }
  finally {
    publishing.value = false
  }
}
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

    <StackPreview
      v-if="roles.length"
      :roles="roles"
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
        {{ rkey ? 'Edit this stack' : 'Keep this stack' }}
      </h2>

      <p
        v-if="published"
        class="publish__lede"
      >
        {{ rkey ? 'Saved to your account.' : 'Published to your account.' }}
        <NuxtLink :to="`/stacks/@${published.handle}/${published.rkey}`">
          See it
        </NuxtLink>, or find it among
        <NuxtLink to="/stacks">
          everyone else’s
        </NuxtLink>.
      </p>

      <template v-else-if="session">
        <p class="publish__lede">
          Signed in as @{{ session.handle }}.
          <template v-if="rkey">
            Saving writes over the stack you published, from your browser.
          </template>
          <template v-else>
            Publishing saves this stack to your own account, from your browser.
          </template>
          You can delete it here or anywhere else you reach that account.
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
            {{ publishing ? 'saving…' : rkey ? 'save changes' : 'publish to my account' }}
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
