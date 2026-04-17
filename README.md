# lolo-ui

An SPA framework toolkit for building dashboards and data-heavy UIs in pure TypeScript. No build step. No JSX. No virtual DOM. Runs natively in Deno and the browser as ES modules.

## What it provides

- **Signals** — fine-grained reactive primitives (`signal`, `computed`, `effect`, `batch`)
- **DOM** — typed element factories that build real DOM nodes directly (`div`, `span`, `button`, `input` etc.)
- **CSS** — atomic CSS-in-JS engine with pseudo-class, media query, and global styles support
- **Components** — `defineComponent` with scoped lifecycle and auto-disposed effects
- **Scopes** — composable lifecycle containers for hooks — work inside and outside components
- **Router** — client-side routing with params, guards, nested layouts, query strings
- **Services** — pluggable data layer with typed adapters for tRPC, REST, and Connect-RPC
- **Form handling** — submission and validation hooks using any Standard Schema library (`@jayobado/lolo-ui/form`)
- **Data fetching** — `useQuery` and `useMutation` hooks with reactive re-fetching, retry, and scope support (`@jayobado/lolo-ui/query`)
- **Components** — unstyled `formField`, `formGroup`, and `dataTable` helpers (`@jayobado/lolo-ui/components`)
- **Hooks** — unstyled `useModal`, `useToaster`, `useTooltip`, `useDropdown` (`@jayobado/lolo-ui/hooks`)
- **Primitives** — `useMediaQuery`, `useLocalStorage`, `useDebounce`, `useInterval`, `useEventListener`, `usePagination`, `useSelection`, `useClipboard`, `createPortal`, `useClickOutside`, `useEscapeKey`, `useFocusTrap`, `useScrollLock`, `computePosition` (`@jayobado/lolo-ui/primitives`)

## What it is not

- A meta framework — no SSR, no file-based routing, no build pipeline
- An opinion on your backend
- A dependency on any other UI framework

## Requirements

- Deno 1.40+ or a modern browser with ES module support
- A server to serve your TypeScript files (see [kiln](https://github.com/jayobado/kiln))

## Installation

### Deno + kiln (recommended)
```sh
deno add jsr:@jayobado/lolo-ui
```

Or in `deno.json`:
```json
{
  "imports": {
    "@jayobado/lolo-ui": "jsr:@jayobado/lolo-ui@^0.1.9",
    "@jayobado/lolo-ui/form": "jsr:@jayobado/lolo-ui@^0.1.9/form",
    "@jayobado/lolo-ui/query": "jsr:@jayobado/lolo-ui@^0.1.9/query",
    "@jayobado/lolo-ui/components": "jsr:@jayobado/lolo-ui@^0.1.9/components",
    "@jayobado/lolo-ui/primitives": "jsr:@jayobado/lolo-ui@^0.1.9/primitives"
  }
}
```

[kiln](https://github.com/jayobado/kiln) (v0.1.8+) handles transpilation and import rewriting automatically.

### Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@jayobado/lolo-ui': 'jsr:@jayobado/lolo-ui',
    },
  },
})
```

### esbuild
```typescript
// build.ts
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.ts'],
  bundle:      true,
  outfile:     'dist/app.js',
  alias: {
    '@jayobado/lolo-ui': './path/to/lolo-ui/mod.ts',
  },
})
```

## Compatibility

| Environment | Supported | Notes |
|---|---|---|
| Deno + kiln | ✓ | Recommended — handles transpilation and import rewriting |
| Deno Deploy | ✓ | Via kiln eager strategy |
| Vite | ✓ | Use resolve alias |
| esbuild | ✓ | Use alias option |
| Any ES module server | ✓ | Serves `.ts` as JS with import resolution |

> `lolo-ui` has one dependency (`@standard-schema/spec` for form validation types). It is pure TypeScript using only browser APIs.

---

## Quick start
```typescript
// public/main.ts
import {
  createApp,
  defineComponent,
  signal,
  div, h1, button, span,
  css,
} from '@jayobado/lolo-ui'

const Counter = defineComponent((_props, { effect }) => {
  const count   = signal(0)
  const countEl = span(null, '0')

  // Scoped to component — disposed automatically on unmount
  effect(() => {
    countEl.textContent = String(count.get())
  })

  return div(
    { styles: { display: 'flex', gap: '12px', alignItems: 'center' } },
    button({ onClick: () => count.update(n => n - 1) }, '−'),
    countEl,
    button({ onClick: () => count.update(n => n + 1) }, '+'),
  )
})

createApp({
  mountPoint: '#app',
  routes: [
    { path: '/', view: (ctx) => Counter(ctx) },
  ],
}).init()
```
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

## Signals

Signals are the reactive core. Any `effect` that reads a signal is automatically re-run when the signal changes.
```typescript
import { signal, computed, effect, batch } from '@jayobado/lolo-ui'

// ── signal ────────────────────────────────────────────────────────────────────

const count = signal(0)

count.get()               // read current value
count.set(1)              // set new value
count.update(n => n + 1)  // update from current value

// ── computed ──────────────────────────────────────────────────────────────────

const doubled = computed(() => count.get() * 2)
doubled.get() // always in sync with count

// ── effect ────────────────────────────────────────────────────────────────────

// Runs immediately, then re-runs whenever count changes
const dispose = effect(() => {
  console.log('count is', count.get())
})

dispose() // stop tracking

// ── batch ─────────────────────────────────────────────────────────────────────

// Multiple updates fire effects only once
batch(() => {
  count.set(10)
  count.set(20) // effects fire after batch completes
})
```

## DOM

Typed factories for every HTML element. Each accepts an optional props object and children.
```typescript
import {
  div, section, article, aside, header, footer, main, nav,
  span, p, h1, h2, h3, h4, h5, h6, strong, em, small, code, pre,
  ul, ol, li,
  form, label, input, button, select, option, textarea, fieldset,
  img, a, hr, br,
  table, thead, tbody, tr, th, td,
} from '@jayobado/lolo-ui'

// No props
div(null, 'Hello')

// With class and styles
div({
  class:  'my-card',
  styles: { padding: 24, background: '#1a1a2e', borderRadius: 8 },
}, 'Content')

// Event handlers
button({ onClick: () => console.log('clicked') }, 'Click me')

// Input — no children
input({ type: 'email', placeholder: 'you@example.com', required: true })

// Anchor
a({ href: '/about' }, 'About')

// Nested children
div(null,
  h1(null, 'Title'),
  p(null, 'Body text'),
  ul(null,
    li(null, 'Item one'),
    li(null, 'Item two'),
  ),
)

// Table
table(null,
  thead(null,
    tr(null, th(null, 'Name'), th(null, 'Role')),
  ),
  tbody(null,
    tr(null, td(null, 'Jane'), td(null, 'Admin')),
  ),
)
```

### Supported props

All element factories extend `ElementProps`:

| Prop | Type | Description |
|---|---|---|
| `class` | `string` | CSS class string |
| `styles` | `StyleObject` | Atomic CSS (see CSS section) |
| `id` | `string` | Element ID |
| `role` | `string` | ARIA role |
| `tabIndex` | `number` | Tab order |
| `key` | `string \| number` | Key for list rendering |
| `aria-label` | `string` | ARIA label |
| `onClick` | `(e: MouseEvent) => void` | Click handler |
| `onInput` | `(e: InputEvent) => void` | Input handler |
| `onChange` | `(e: Event) => void` | Change handler |
| `onSubmit` | `(e: SubmitEvent) => void` | Submit handler |
| `onKeydown` | `(e: KeyboardEvent) => void` | Keydown handler |
| `onFocus` | `(e: FocusEvent) => void` | Focus handler |
| `onBlur` | `(e: FocusEvent) => void` | Blur handler |

## Components

### `defineComponent`

Every component receives typed props and a `ComponentContext`. The setup function runs once and returns the root DOM element.
```typescript
import { defineComponent, signal, div, span, button } from '@jayobado/lolo-ui'

const UserCard = defineComponent<{ name: string; role: string }>(
  (props, { onMount, onUnmount, effect }) => {
    const expanded = signal(false)
    const detailEl = span(null, '')

    // effect is scoped — disposed automatically when component unmounts
    effect(() => {
      detailEl.textContent = expanded.get()
        ? `Role: ${props.role}`
        : ''
    })

    onMount(() => {
      console.log(`${props.name} mounted`)
    })

    onUnmount(() => {
      console.log(`${props.name} unmounted`)
    })

    return div(null,
      span(null, props.name),
      detailEl,
      button({
        onClick: () => expanded.update(v => !v),
      }, 'Toggle'),
    )
  }
)
```

### `ComponentContext`

`ComponentContext` extends `Scope`. See the [Scopes](#scopes) section for full details.

| Method | Description |
|---|---|
| `onMount(fn)` | Called after the component is added to the DOM |
| `onUnmount(fn)` | Called before the component is removed (alias for `onCleanup`) |
| `effect(fn)` | Reactive effect scoped to this component's lifetime |
| `onCleanup(fn)` | Arbitrary cleanup function, runs on dispose |
| `dispose()` | Tears down all effects and cleanup functions |

### `h()` — mount a component
```typescript
import { h } from '@jayobado/lolo-ui'

// Typed props from component definition
const el = h(UserCard, { name: 'Jane', role: 'Admin' })
```

## CSS

The CSS engine generates atomic class names from style objects and injects rules into a `<style>` tag in `<head>`. Identical property+value pairs always share the same class — rules are never duplicated.

### `css()` — reactive styles
```typescript
import { css } from '@jayobado/lolo-ui'

const className = css({
  display:      'flex',
  gap:          16,
  padding:      '12px 24px',
  background:   '#1a1a2e',
  borderRadius: 8,

  // Pseudo-classes
  pseudo: {
    ':hover':    { background: '#2a2a3e' },
    ':focus':    { outline: '2px solid #4a9edd' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },

  // Media queries
  media: {
    '(max-width: 768px)': { padding: '8px 16px' },
    '(prefers-color-scheme: light)': { background: '#ffffff' },
  },
})

div({ class: className }, 'Styled')
```

### Combining classes
```typescript
// Static class + generated class
div({ class: `my-existing-class ${css({ color: 'white' })}` })

// Conditional
const isActive = true
div({
  class: [
    baseStyles,
    isActive ? css({ background: '#4a9edd' }) : '',
  ].filter(Boolean).join(' ')
})
```

### Numbers and units

Numbers are automatically converted to `px` except for unitless properties:
```typescript
css({
  padding:      16,    // → padding: 16px
  borderRadius: 8,     // → border-radius: 8px
  opacity:      0.5,   // → opacity: 0.5  (no px)
  zIndex:       10,    // → z-index: 10   (no px)
  fontWeight:   700,   // → font-weight: 700 (no px)
  lineHeight:   1.5,   // → line-height: 1.5 (no px)
})
```

### `globalStyles()` — global rules and CSS variables

For element selectors, resets, and CSS custom properties that don't belong in a scoped class:
```typescript
import { globalStyles } from '@jayobado/lolo-ui'

globalStyles({
  ':root': {
    '--color-primary': '#2356d7',
    '--color-danger': '#d61f47',
    '--color-text': '#212529',
    '--color-bg': '#fff',
    '--color-border': '#dfe3ea',
    '--radius': '0.375rem',
    '--font-sans': '"Inter", system-ui, sans-serif',
  },
  '*, *::before, *::after': {
    boxSizing: 'border-box',
  },
  'body': {
    margin: 0,
    fontFamily: 'var(--font-sans)',
    fontSize: '16px',
    lineHeight: 1.5,
    color: 'var(--color-text)',
    background: 'var(--color-bg)',
  },
  'a': {
    color: 'var(--color-primary)',
    textDecoration: 'none',
  },
})
```

Keys starting with `--` are passed through as CSS custom properties. Everything else uses the same camelCase-to-kebab conversion and auto `px` as `css()`. Rules are injected into the same shared `<style>` element.

### Fonts

Pass font faces as the second argument to `globalStyles()`:
```typescript
globalStyles({
  'body': { fontFamily: '"Inter", system-ui, sans-serif' },
}, [
  { family: '"Inter"', src: 'url(/fonts/Inter-Regular.woff2) format("woff2")', weight: 400 },
  { family: '"Inter"', src: 'url(/fonts/Inter-Medium.woff2) format("woff2")', weight: 500 },
])
```

Place font files in your static directory (e.g. `client/fonts/`). Each entry generates an `@font-face` rule with `font-display: swap` by default.

## Scopes

Scopes track effects and cleanup functions, disposing them all at once. Inside `defineComponent`, a scope is created automatically — hooks called during setup bind to it. Outside a component, you create a scope manually.

### `createScope` — manual scope

```typescript
import { createScope } from '@jayobado/lolo-ui'

const scope = createScope()

scope.effect(() => {
  console.log('tracked effect')
})

scope.onCleanup(() => {
  console.log('runs on dispose')
})

// Tears down all effects and cleanup functions
scope.dispose()
```

### `runInScope` — implicit scope for multiple hooks

```typescript
import { createScope, runInScope } from '@jayobado/lolo-ui'

const scope = createScope()

runInScope(scope, () => {
  // All hooks called here bind to this scope automatically
  const { submit } = useSubmit(...)
  const { output } = useParse(...)
})

// Later — disposes everything created inside runInScope
scope.dispose()
```

### How hooks resolve their scope

Every hook follows the same resolution order:

1. **Explicit scope** — if passed as an argument, it wins
2. **Active scope** — set by `defineComponent` or `runInScope`
3. **No scope** — the hook still works, but the caller is responsible for calling `dispose()` manually

```typescript
// Inside a component — scope is automatic
const MyView = defineComponent((props, ctx) => {
  const { submit } = useSubmit(options, callback)  // bound to component lifecycle
  return div(null, ...)
})

// Standalone — explicit scope
const scope = createScope()
const { submit } = useSubmit(options, callback, scope)
scope.dispose()

// Standalone — no scope, manual cleanup
const { submit, dispose } = useSubmit(options, callback)
dispose()
```

## Router
```typescript
import { createApp } from '@jayobado/lolo-ui'

// Auth guard — return true to proceed, string to redirect
const requiresAuth = async () => {
  return localStorage.getItem('token') ? true : '/login'
}

createApp({
  mountPoint: '#app',

  routes: [
    // Public
    { path: '/',      view: (ctx) => HomeView(ctx)  },
    { path: '/login', view: (ctx) => LoginView(ctx) },

    // Named params — available via ctx.params.id
    { path: '/users/:id', view: (ctx) => UserView(ctx) },

    // Query strings — available via ctx.query.tab
    { path: '/settings', view: (ctx) => SettingsView(ctx) },

    // With auth guard
    {
      path:   '/dashboard',
      view:   (ctx) => DashboardView(ctx),
      guards: [requiresAuth],
    },

    // Nested layout
    {
      path:   '/dashboard/users',
      layout: (content, ctx) => DashboardLayout({ content, ctx }),
      view:   (ctx) => UsersView(ctx),
      guards: [requiresAuth],
    },
  ],

  fallback: (ctx) => NotFoundView(ctx),

  onInit: async () => {
    // Runs once before first route renders
  },
}).init()
```

### Route context
```typescript
interface RouteContext {
  params: Record<string, string>  // /users/:id → { id: '123' }
  query:  Record<string, string>  // ?tab=info  → { tab: 'info' }
  path:   string                  // /users/123
}
```

### Navigation
```typescript
const { navigateTo, back, forward } = await createApp({ ... }).init()

navigateTo('/dashboard')
navigateTo('/users/123')
back()
forward()
```

## Services

Define your service contract once. Swap the transport without touching your views.

### Defining services
```typescript
// services/app.ts
import { Services } from '@jayobado/lolo-ui'

const { defineServices, query, mutation, subscription } = Services

export interface User {
  id:    string
  name:  string
  email: string
  role:  string
}

export interface PaginatedResult<T> {
  data:    T[]
  total:   number
  page:    number
  perPage: number
}

export const appServices = defineServices({
  users: {
    list:    query<{ page?: number; perPage?: number }, PaginatedResult<User>>('users/list'),
    getById: query<{ id: string }, User>('users/getById'),
    create:  mutation<Omit<User, 'id'>, User>('users/create'),
    update:  mutation<{ id: string } & Partial<User>, User>('users/update'),
    delete:  mutation<{ id: string }, void>('users/delete'),
  },
  auth: {
    login:  mutation<{ email: string; password: string }, { token: string }>('auth/login'),
    logout: mutation<void, void>('auth/logout'),
    me:     query<void, User>('auth/me'),
  },
})

export type AppServices = typeof appServices
```

### Configuring an adapter
```typescript
// main.ts
import { configureServices, Adapters } from '@jayobado/lolo-ui'
import { appServices }                  from './services/app.ts'

configureServices(
  Adapters.createTrpcAdapter(appServices, {
    baseUrl: '/api',
  })
)
```

### Using services in a view
```typescript
import { defineComponent, signal, div } from '@jayobado/lolo-ui'
import { useServices }                   from '@jayobado/lolo-ui'
import type { AppServices, User }        from './services/app.ts'

const UsersView = defineComponent((_props, { onMount, effect }) => {
  const users   = signal<User[]>([])
  const loading = signal(true)
  const error   = signal<string | null>(null)

  const services = useServices<AppServices>()

  onMount(async () => {
    try {
      const result = await services.users.list({ page: 1 })
      users.set(result.data)
    } catch {
      error.set('Failed to load users')
    } finally {
      loading.set(false)
    }
  })

  const container = div({ styles: { padding: 24 } })

  effect(() => {
    if (loading.get()) {
      container.textContent = 'Loading...'
      return
    }
    if (error.get()) {
      container.textContent = error.get()!
      return
    }
    container.replaceChildren(
      ...users.get().map(u =>
        div({ styles: { padding: '8px 0' } }, u.name)
      )
    )
  })

  return container
})
```

### Available adapters
```typescript
import { Adapters } from '@jayobado/lolo-ui'

// tRPC
Adapters.createTrpcAdapter(services, { baseUrl: '/api' })

// REST
Adapters.createRestAdapter(services, {
  baseUrl:    'https://api.example.com',
  getHeaders: () => ({
    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`
  }),
  methodMap: {
    'users/delete': 'DELETE',
    'users/update': 'PATCH',
  },
})

// Connect-RPC / gRPC-Web via Envoy
Adapters.createConnectAdapter(services, {
  baseUrl:  'https://grpc.example.com',
  protocol: 'grpc-web',
})
```

### Custom adapter
```typescript
import type { Transport } from '@jayobado/lolo-ui'

const myTransport: Transport = {
  query:     (path, input) => myClient.get(path, input),
  mutate:    (path, input) => myClient.post(path, input),
  subscribe: (path, input, callbacks) => myClient.stream(path, input, callbacks),
}
```

## Form handling

The `@jayobado/lolo-ui/form` subpath provides hooks for form submission and validation using any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible library (Valibot, Zod, ArkType, etc.).

```typescript
import { useSubmit, useParse, flatten } from '@jayobado/lolo-ui/form'
```

### `useSubmit` — form submission

Handles schema validation, submission state, and error formatting. The submit callback is always the second argument. An optional third argument accepts an explicit scope.

#### With Valibot

```typescript
import { useSubmit } from '@jayobado/lolo-ui/form'
import * as v from 'valibot'

const fields = { name: '', email: '' }

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email')),
})

const { submit, submitting, errors } = useSubmit(
  { input: () => fields, schema: () => schema },
  async (validated) => {
    // validated is typed as { name: string; email: string }
    await api.createUser(validated)
  },
)
```

#### With Zod

```typescript
import { useSubmit } from '@jayobado/lolo-ui/form'
import * as z from 'zod'

const fields = { name: '', email: '' }

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
})

const { submit, submitting, errors } = useSubmit(
  { input: () => fields, schema: () => schema },
  async (validated) => {
    // validated is typed as { name: string; email: string }
    await api.createUser(validated)
  },
)
```

#### Full component example

```typescript
import { defineComponent, signal, div, span, input, button, form } from '@jayobado/lolo-ui'
import { useSubmit, flatten } from '@jayobado/lolo-ui/form'
import * as v from 'valibot'

const LoginForm = defineComponent((_props, ctx) => {
  const fields = { email: '', password: '' }

  const schema = v.object({
    email: v.pipe(v.string(), v.email('Invalid email')),
    password: v.pipe(v.string(), v.minLength(8, 'Min 8 characters')),
  })

  let formElement: HTMLElement

  const { submit, submitting, errors } = useSubmit(
    {
      form: () => formElement,
      input: () => fields,
      schema: () => schema,
      formatErrors: flatten,
    },
    async (validated) => {
      await api.login(validated)
    },
  )

  const emailError = span(null)
  const passwordError = span(null)
  const submitBtn = button({ type: 'submit' }, 'Sign in')

  ctx.effect(() => {
    const errs = errors.get()
    emailError.textContent = errs?.nested?.email?.[0] ?? ''
    passwordError.textContent = errs?.nested?.password?.[0] ?? ''
    submitBtn.textContent = submitting.get() ? 'Signing in...' : 'Sign in'
    ;(submitBtn as HTMLButtonElement).disabled = submitting.get()
  })

  formElement = form(
    { onSubmit: (e) => { e.preventDefault(); submit() } },
    input({
      type: 'email',
      placeholder: 'Email',
      onInput: (e) => { fields.email = (e.target as HTMLInputElement).value },
    }),
    emailError,
    input({
      type: 'password',
      placeholder: 'Password',
      onInput: (e) => { fields.password = (e.target as HTMLInputElement).value },
    }),
    passwordError,
    submitBtn,
  )

  return formElement
})
```

#### Options

| Option | Type | Description |
|---|---|---|
| `form` | `() => HTMLElement` | Getter returning form element — enables HTML5 validation |
| `input` | `() => T` | Getter returning form data |
| `schema` | `() => StandardSchemaV1` | Getter returning Standard Schema for validation |
| `formatErrors` | `(issues) => TErrors` | Custom error formatter (default: raw issues array) |
| `onErrors` | `(errors) => void` | Called when validation fails or submit sets errors |
| `submitting` | `Signal<boolean>` | Injectable signal — share across hooks |
| `submitted` | `Signal<boolean>` | Injectable signal |
| `errors` | `Signal<TErrors>` | Injectable signal |

#### Without schema

```typescript
const { submit, submitting } = useSubmit(
  { input: () => fields },
  async (data) => {
    await api.save(data)
  },
)
```

#### Without input

```typescript
const { submit, submitting } = useSubmit(
  {},
  async () => {
    await api.refresh()
  },
)
```

#### Shared state

```typescript
import { signal } from '@jayobado/lolo-ui'

const submitting = signal(false)

// Both hooks share the same submitting signal — only one can submit at a time
const formA = useSubmit({ submitting, input: () => fieldsA, schema: () => schemaA }, onSubmitA)
const formB = useSubmit({ submitting, input: () => fieldsB, schema: () => schemaB }, onSubmitB)
```

#### HTML5 form validation

Pass a getter that returns the form element. The getter is evaluated lazily when `submit()` is called, so it works even when the form element is created after `useSubmit`.

```typescript
let formElement: HTMLElement

const { submit } = useSubmit(
  {
    form: () => formElement,
    input: () => fields,
    schema: () => schema,
  },
  async (validated) => { await api.save(validated) },
)

// Created after useSubmit — works because form option is a getter
formElement = form(
  { onSubmit: (e) => { e.preventDefault(); submit() } },
  input({ type: 'email', required: true }),
  button({ type: 'submit' }, 'Save'),
)
```

If the element is a `<form>`, `checkValidity()` and `reportValidity()` are called before schema validation. If it's any other element, the check is skipped.

### `useParse` — reactive validation

Continuously validates input against a schema using an effect. Useful for pre-submit validation or real-time feedback.

#### With Valibot

```typescript
import { useParse, flatten } from '@jayobado/lolo-ui/form'
import * as v from 'valibot'

const fields = { age: '' }

const { output, errors } = useParse({
  input: () => fields,
  schema: () => v.object({ age: v.number() }),
  formatErrors: flatten,
})
```

#### With Zod

```typescript
import { useParse, flatten } from '@jayobado/lolo-ui/form'
import * as z from 'zod'

const fields = { age: '' }

const { output, errors } = useParse({
  input: () => fields,
  schema: () => z.object({ age: z.number() }),
  formatErrors: flatten,
})
```

#### Return values

| Property | Type | Description |
|---|---|---|
| `output` | `Signal<T \| undefined>` | Validated output (undefined if invalid) |
| `errors` | `Signal<TErrors \| undefined>` | Formatted errors (undefined if valid) |
| `dispose` | `() => void` | Stop reactive validation |

### `flatten` — error formatter

Converts Standard Schema issues into a flat structure with `root` and `nested` errors. Compatible with both Valibot's and Zod's issue format.

```typescript
import { flatten } from '@jayobado/lolo-ui/form'
import type { FlatErrors } from '@jayobado/lolo-ui/form'

const { errors } = useSubmit(
  { input: () => fields, schema: () => schema, formatErrors: flatten },
  async (validated) => { ... },
)

// errors.get()?.root     → string[] | undefined
// errors.get()?.nested   → { [dotPath: string]: string[] } | undefined
```

## Data fetching

The `@jayobado/lolo-ui/query` subpath provides hooks for data fetching and mutations. Both support the scope system — automatic cleanup inside components, explicit scope or manual `dispose()` outside.

```typescript
import { useQuery, useMutation } from '@jayobado/lolo-ui/query'
```

### `useQuery` — reactive data fetching

Fetches data and re-fetches automatically when signal dependencies change. Any signals read inside the query function are tracked — no query keys needed.

```typescript
import { useQuery } from '@jayobado/lolo-ui/query'

const { data, error, loading, refetch } = useQuery(
  () => api.users.list({ page: 1 }),
)
```

#### Reactive dependencies

When a signal changes inside the query function, the query re-fetches automatically:

```typescript
import { signal } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'

const page = signal(1)

const { data, loading } = useQuery(
  () => api.users.list({ page: page.get() }),
)

// Changing page triggers a re-fetch
page.set(2)
```

#### Conditional fetching

Use `enabled` to control when the query runs:

```typescript
import { signal } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'

const userId = signal<string | null>(null)

const { data, loading } = useQuery(
  () => api.users.getById({ id: userId.get()! }),
  { enabled: () => !!userId.get() },
)

// Query runs only after userId is set
userId.set('123')
```

#### Retry

```typescript
const { data, error } = useQuery(
  () => api.users.list({ page: 1 }),
  { retry: 3, retryDelay: 2000 },
)
```

#### With lolo-ui components

```typescript
import { defineComponent, signal, div, span, button } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'

const UserList = defineComponent((_props, ctx) => {
  const page = signal(1)

  const { data, loading, error } = useQuery(
    () => api.users.list({ page: page.get() }),
  )

  const container = div({ styles: { padding: 24 } })

  ctx.effect(() => {
    if (loading.get()) {
      container.replaceChildren(span(null, 'Loading...'))
      return
    }
    if (error.get()) {
      container.replaceChildren(span(null, error.get()!.message))
      return
    }
    const result = data.get()!
    container.replaceChildren(
      ...result.data.map(u => div(null, u.name)),
      div(null,
        button({ onClick: () => page.update(n => n - 1), disabled: page.get() <= 1 }, 'Prev'),
        span(null, `Page ${page.get()}`),
        button({ onClick: () => page.update(n => n + 1) }, 'Next'),
      ),
    )
  })

  return container
})
```

#### Standalone usage

```typescript
import { createScope } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'

const scope = createScope()

const { data, refetch } = useQuery(
  () => api.users.list({ page: 1 }),
  {},
  scope,
)

// Later
scope.dispose()
```

#### Options

| Option | Type | Description |
|---|---|---|
| `enabled` | `() => boolean` | Getter controlling whether the query runs (default: `true`) |
| `retry` | `number` | Number of retry attempts on failure (default: `0`) |
| `retryDelay` | `number` | Milliseconds between retries (default: `1000`) |
| `onError` | `(err: Error) => void` | Called when all retries are exhausted |

#### Return values

| Property | Type | Description |
|---|---|---|
| `data` | `Signal<T \| undefined>` | Last successful result |
| `error` | `Signal<Error \| undefined>` | Last error (cleared on next fetch) |
| `loading` | `Signal<boolean>` | Whether a fetch is in progress |
| `refetch` | `() => Promise<void>` | Manually trigger a re-fetch |
| `dispose` | `() => void` | Stop reactive tracking and clean up |

### `useMutation` — imperative async operations

Wraps any async function with loading, error, and result state. Use for operations triggered by user actions that aren't form submissions — deletes, toggles, reordering, etc.

```typescript
import { useMutation } from '@jayobado/lolo-ui/query'

const { mutate, loading, error, data } = useMutation(
  (id: string) => api.users.delete({ id }),
  {
    onSuccess: () => { navigateTo('/users') },
    onError: (err) => { toast.show(err.message) },
  },
)
```

#### Usage in a component

```typescript
import { defineComponent, signal, div, button, span } from '@jayobado/lolo-ui'
import { useMutation } from '@jayobado/lolo-ui/query'

const DeleteButton = defineComponent<{ userId: string }>((props, ctx) => {
  const { mutate, loading } = useMutation(
    (id: string) => api.users.delete({ id }),
    {
      onSuccess: () => { window.location.href = '/users' },
    },
  )

  const btn = button(null, 'Delete user')

  ctx.effect(() => {
    btn.textContent = loading.get() ? 'Deleting...' : 'Delete user'
    ;(btn as HTMLButtonElement).disabled = loading.get()
  })

  btn.addEventListener('click', () => mutate(props.userId))

  return btn
})
```

#### Toggling state

```typescript
import { useMutation } from '@jayobado/lolo-ui/query'

const project = signal<Project>(initialProject)

const { mutate: toggleArchive, loading } = useMutation(
  (id: string) => api.projects.toggleArchive({ id }),
  {
    onSuccess: (result) => { project.set(result) },
  },
)

const btn = button(null, 'Archive')
btn.addEventListener('click', () => toggleArchive(project.get().id))
```

#### Options

| Option | Type | Description |
|---|---|---|
| `retry` | `number` | Number of retry attempts on failure (default: `0`) |
| `retryDelay` | `number` | Milliseconds between retries (default: `1000`) |
| `onSuccess` | `(result: T) => void` | Called after successful execution |
| `onError` | `(err: Error) => void` | Called after all retries are exhausted |
| `onSettled` | `() => void` | Called after completion, regardless of outcome |

#### Return values

| Property | Type | Description |
|---|---|---|
| `mutate` | `(...args) => Promise<T \| undefined>` | Trigger the mutation |
| `data` | `Signal<T \| undefined>` | Last successful result |
| `error` | `Signal<Error \| undefined>` | Last error |
| `loading` | `Signal<boolean>` | Whether the mutation is in progress |
| `reset` | `() => void` | Clear data, error, and loading state |
| `dispose` | `() => void` | Clean up (calls reset) |

### When to use what

| Scenario | Hook |
|---|---|
| Fetch data on mount or when dependencies change | `useQuery` |
| Submit a form with validation | `useSubmit` (from `@jayobado/lolo-ui/form`) |
| Delete, toggle, or any non-form write operation | `useMutation` |
| Real-time input validation | `useParse` (from `@jayobado/lolo-ui/form`) |

## Components

The `@jayobado/lolo-ui/components` subpath provides low-level helpers that reduce DOM boilerplate without imposing any styling or layout opinions. All components are unstyled by default — use `styles`, `class`, or both to control appearance.

```typescript
import { formField, formGroup, dataTable } from '@jayobado/lolo-ui/components'
```

### `formField` — label + input + error

Wraps a label, input (passed as children), and optional error message into a `div`. The label is linked to the input via the `for` attribute, and errors use `role="alert"` for accessibility.

```typescript
import { formField } from '@jayobado/lolo-ui/components'
import { input } from '@jayobado/lolo-ui'

formField(
  { label: 'Email', name: 'email', required: true },
  input({ name: 'email', type: 'email', placeholder: 'you@example.com' }),
)
```

#### Styled

```typescript
formField(
  {
    label: 'Email',
    name: 'email',
    error: errors.get()?.nested?.email?.[0],
    required: true,
    styles: { display: 'flex', flexDirection: 'column', gap: 4 },
    labelStyles: { fontSize: 14, fontWeight: 600, color: '#ccc' },
    errorStyles: { fontSize: 12, color: '#ef4444' },
  },
  input({
    name: 'email',
    type: 'email',
    styles: { padding: '8px 12px', borderRadius: 4, border: '1px solid #333' },
  }),
)
```

#### Props

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Label text (required) |
| `name` | `string` | Links label `for` attribute to input |
| `error` | `string` | Error message to display |
| `required` | `boolean` | Appends ` *` to label text |
| `class` | `string` | CSS class on wrapper div |
| `styles` | `StyleObject` | Atomic CSS on wrapper div |
| `labelStyles` | `StyleObject` | Atomic CSS on label |
| `errorStyles` | `StyleObject` | Atomic CSS on error span |

### `formGroup` — fieldset + legend

```typescript
import { formGroup, formField } from '@jayobado/lolo-ui/components'
import { input } from '@jayobado/lolo-ui'

formGroup(
  { legend: 'Billing address', styles: { border: '1px solid #333', padding: 16, borderRadius: 8 } },
  formField({ label: 'Street', name: 'street' }, input({ name: 'street' })),
  formField({ label: 'City', name: 'city' }, input({ name: 'city' })),
  formField({ label: 'Zip', name: 'zip' }, input({ name: 'zip' })),
)
```

#### Props

| Prop | Type | Description |
|---|---|---|
| `legend` | `string` | Legend text |
| `class` | `string` | CSS class on fieldset |
| `styles` | `StyleObject` | Atomic CSS on fieldset |
| `legendStyles` | `StyleObject` | Atomic CSS on legend |

### `dataTable` — column-driven table

```typescript
import { dataTable } from '@jayobado/lolo-ui/components'
import { button } from '@jayobado/lolo-ui'
import type { Column } from '@jayobado/lolo-ui/components'

interface User { id: string; name: string; role: string }

const columns: Column<User>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  {
    key: 'actions',
    header: '',
    render: (row) => button({ onClick: () => edit(row.id) }, 'Edit'),
  },
]

dataTable({
  columns,
  rows: users.get(),
  onRowClick: (row) => navigateTo(`/users/${row.id}`),
  emptyText: 'No users found',
})
```

#### Reactive table

```typescript
import { defineComponent, signal, div } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'
import { dataTable } from '@jayobado/lolo-ui/components'

const UserTable = defineComponent((_props, ctx) => {
  const { data, loading } = useQuery(() => api.users.list({ page: 1 }))

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
  ]

  const container = div(null)

  ctx.effect(() => {
    if (loading.get()) {
      container.replaceChildren(div(null, 'Loading...'))
      return
    }
    container.replaceChildren(
      dataTable({ columns, rows: data.get()?.data ?? [] }),
    )
  })

  return container
})
```

#### Column definition

| Property | Type | Description |
|---|---|---|
| `key` | `string` | Property name to read from row (used when no `render`) |
| `header` | `string` | Column header text |
| `render` | `(row, index) => HTMLElement \| string` | Custom cell renderer |
| `headerStyles` | `StyleObject` | Atomic CSS on `th` |
| `cellStyles` | `StyleObject` | Atomic CSS on `td` |

#### Table props

| Prop | Type | Description |
|---|---|---|
| `columns` | `Column<T>[]` | Column definitions (required) |
| `rows` | `T[]` | Data rows (required) |
| `class` | `string` | CSS class on `table` |
| `styles` | `StyleObject` | Atomic CSS on `table` |
| `headerStyles` | `StyleObject` | Atomic CSS on header `tr` |
| `rowStyles` | `StyleObject \| (row, index) => StyleObject` | Static or per-row styles |
| `emptyText` | `string` | Text when rows is empty (default: `'No data'`) |
| `rowKey` | `(row, index) => string \| number` | Key extraction for list rendering |
| `onRowClick` | `(row, index) => void` | Row click handler |

## Primitives

The `@jayobado/lolo-ui/primitives` subpath provides low-level building blocks for interactive UI patterns. All primitives support the scope system — automatic cleanup inside components, explicit scope or manual disposal outside.

```typescript
import {
  createPortal, useClickOutside, useEscapeKey,
  useFocusTrap, useScrollLock, computePosition,
  useMediaQuery, useLocalStorage, useDebounce, useDebounceFn,
  useInterval, useEventListener, usePagination, useSelection, useClipboard,
} from '@jayobado/lolo-ui/primitives'
```

### `createPortal` — render outside the component tree

```typescript
import { createPortal } from '@jayobado/lolo-ui/primitives'
import { div } from '@jayobado/lolo-ui'

const { element, remove } = createPortal(
  div(null, 'I am portaled'),
)

// Later
remove()
```

### `useClickOutside` — detect clicks outside an element

```typescript
import { useClickOutside } from '@jayobado/lolo-ui/primitives'

const menuEl = div(null, 'Menu content')

const dispose = useClickOutside(
  () => menuEl,
  () => { console.log('clicked outside') },
)
```

### `useEscapeKey` — listen for escape key

```typescript
import { useEscapeKey } from '@jayobado/lolo-ui/primitives'

const dispose = useEscapeKey(() => {
  console.log('escape pressed')
})
```

### `useFocusTrap` — trap focus within a container

```typescript
import { useFocusTrap } from '@jayobado/lolo-ui/primitives'

const dialog = div(null,
  input({ type: 'text', placeholder: 'Name' }),
  button(null, 'Submit'),
)

const release = useFocusTrap(() => dialog)

// Later
release()
```

### `useScrollLock` — prevent body scrolling

```typescript
import { useScrollLock } from '@jayobado/lolo-ui/primitives'

const unlock = useScrollLock()

// Later
unlock()
```

### `computePosition` — position a floating element

```typescript
import { computePosition } from '@jayobado/lolo-ui/primitives'

const { top, left, placement } = computePosition(triggerEl, floatingEl, {
  placement: 'bottom',
  offset: 8,
})

floatingEl.style.position = 'fixed'
floatingEl.style.top = `${top}px`
floatingEl.style.left = `${left}px`
```

#### Placement options

`'top'` | `'bottom'` | `'left'` | `'right'` — defaults to `'bottom'`. If the preferred placement doesn't fit, it tries the opposite side, then the remaining two.

### `useMediaQuery` — reactive media query

```typescript
import { useMediaQuery } from '@jayobado/lolo-ui/primitives'

const { matches } = useMediaQuery('(max-width: 768px)')

ctx.effect(() => {
  container.replaceChildren(
    matches.get() ? mobileLayout() : desktopLayout(),
  )
})
```

### `useLocalStorage` — persistent reactive state

```typescript
import { useLocalStorage } from '@jayobado/lolo-ui/primitives'

const { value: theme, remove } = useLocalStorage('theme', 'dark')

theme.set('light') // persisted automatically

remove() // clear from storage and reset to initial
```

### `useDebounce` — debounce a reactive value

```typescript
import { signal } from '@jayobado/lolo-ui'
import { useDebounce } from '@jayobado/lolo-ui/primitives'

const search = signal('')
const { value: debouncedSearch } = useDebounce(() => search.get(), 300)
```

### `useDebounceFn` — debounce a callback

```typescript
import { useDebounceFn } from '@jayobado/lolo-ui/primitives'

const { call: debouncedFetch, cancel } = useDebounceFn(
  (query: string) => api.search({ query }),
  300,
)

input({ onInput: (e) => debouncedFetch((e.target as HTMLInputElement).value) })
```

### `useInterval` — auto-disposing interval

```typescript
import { useInterval } from '@jayobado/lolo-ui/primitives'

const { stop, restart } = useInterval(
  () => api.notifications.poll(),
  30_000,
  { immediate: true },
)
```

### `useEventListener` — type-safe event listener

```typescript
import { useEventListener } from '@jayobado/lolo-ui/primitives'

useEventListener(window, 'resize', (e) => {
  console.log(window.innerWidth)
})

useEventListener(myElement, 'click', (e) => {
  console.log(e.clientX)
})
```

### `usePagination` — page state management

```typescript
import { usePagination } from '@jayobado/lolo-ui/primitives'
import { useQuery } from '@jayobado/lolo-ui/query'

const pager = usePagination({ page: 1, pageSize: 20 })

const { data } = useQuery(() =>
  api.users.list({ page: pager.page.get(), perPage: pager.pageSize.get() }),
)

ctx.effect(() => {
  const result = data.get()
  if (result) pager.total.set(result.total)
})
```

#### Return values

| Property | Type | Description |
|---|---|---|
| `page` | `Signal<number>` | Current page |
| `pageSize` | `Signal<number>` | Items per page |
| `total` | `Signal<number>` | Total item count |
| `totalPages` | `Computed<number>` | Calculated total pages |
| `hasNext` | `Computed<boolean>` | Whether next page exists |
| `hasPrev` | `Computed<boolean>` | Whether previous page exists |
| `next()` | `() => void` | Go to next page |
| `prev()` | `() => void` | Go to previous page |
| `goTo(n)` | `(page: number) => void` | Jump to specific page (clamped) |
| `reset()` | `() => void` | Reset to initial page |

### `useSelection` — track selected items

```typescript
import { useSelection } from '@jayobado/lolo-ui/primitives'

const { isSelected, toggle, selectAll, clear, count, toArray } = useSelection<string>()

toggle(user.id)

ctx.effect(() => {
  countEl.textContent = `${count.get()} selected`
})

const ids = toArray()
```

#### Return values

| Property | Type | Description |
|---|---|---|
| `selected` | `Signal<Set<T>>` | The selected items set |
| `isSelected(item)` | `(item: T) => boolean` | Check if item is selected |
| `toggle(item)` | `(item: T) => void` | Toggle selection |
| `select(item)` | `(item: T) => void` | Add to selection |
| `deselect(item)` | `(item: T) => void` | Remove from selection |
| `selectAll(items)` | `(items: T[]) => void` | Replace selection with items |
| `clear()` | `() => void` | Clear all selections |
| `count` | `Computed<number>` | Number of selected items |
| `toArray()` | `() => T[]` | Selected items as array |

### `useClipboard` — copy to clipboard

```typescript
import { useClipboard } from '@jayobado/lolo-ui/primitives'
import { button } from '@jayobado/lolo-ui'

const { copy, copied } = useClipboard({ resetDelay: 2000 })

const btn = button(null, 'Copy email')

btn.addEventListener('click', () => copy(user.email))

ctx.effect(() => {
  btn.textContent = copied.get() ? 'Copied!' : 'Copy email'
})
```

## Hooks

The `@jayobado/lolo-ui/hooks` subpath provides unstyled interactive components built on top of the primitives. All support the scope system and are styled entirely by you.

### `useModal` — dialog with focus trapping and scroll lock

```typescript
import { useModal } from '@jayobado/lolo-ui/hooks'
import { div, h2, p, button } from '@jayobado/lolo-ui'

const { open, close, isOpen } = useModal(
  () => div(null,
    h2(null, 'Are you sure?'),
    p(null, 'This action cannot be undone.'),
    div({ styles: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
      button({ onClick: close }, 'Cancel'),
      button({ onClick: () => { handleDelete(); close() } }, 'Delete'),
    ),
  ),
  {
    backdropStyles: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    styles: {
      background: '#1a1a2e', borderRadius: 8, padding: 24, minWidth: 400,
    },
  },
)
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `class` | `string` | — | CSS class on content wrapper |
| `styles` | `StyleObject` | — | Atomic CSS on content wrapper |
| `backdropClass` | `string` | — | CSS class on backdrop |
| `backdropStyles` | `StyleObject` | — | Atomic CSS on backdrop |
| `closeOnBackdrop` | `boolean` | `true` | Close when clicking backdrop |
| `closeOnEscape` | `boolean` | `true` | Close on escape key |
| `trapFocus` | `boolean` | `true` | Trap tab navigation inside modal |
| `lockScroll` | `boolean` | `true` | Prevent body scrolling |
| `onOpen` | `() => void` | — | Called after modal opens |
| `onClose` | `() => void` | — | Called after modal closes |

#### Return values

| Property | Type | Description |
|---|---|---|
| `open` | `() => void` | Open the modal |
| `close` | `() => void` | Close the modal |
| `isOpen` | `Signal<boolean>` | Whether modal is open |
| `dispose` | `() => void` | Close and clean up |

### `useToaster` — toast notifications

```typescript
import { useToaster } from '@jayobado/lolo-ui/hooks'

const toast = useToaster({
  containerStyles: {
    position: 'fixed', top: 16, right: 16, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  variantStyles: {
    success: { background: '#065f46', color: '#fff', padding: '12px 16px', borderRadius: 6 },
    error: { background: '#991b1b', color: '#fff', padding: '12px 16px', borderRadius: 6 },
    info: { background: '#1e3a5f', color: '#fff', padding: '12px 16px', borderRadius: 6 },
    warning: { background: '#92400e', color: '#fff', padding: '12px 16px', borderRadius: 6 },
  },
})

toast.show('User created', { variant: 'success' })
toast.show('Something went wrong', { variant: 'error', duration: 5000 })
toast.show('Persistent message', { duration: 0 })
```

#### Toast options

| Option | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | `3000` | Auto-dismiss delay in ms (`0` = persistent) |
| `variant` | `ToastVariant` | `'info'` | `'info'` \| `'success'` \| `'warning'` \| `'error'` |
| `class` | `string` | — | CSS class on toast element |
| `styles` | `StyleObject` | — | Atomic CSS on toast element |
| `dismissible` | `boolean` | `true` | Click to dismiss |

### `useTooltip` — hover/focus tooltip

```typescript
import { useTooltip } from '@jayobado/lolo-ui/hooks'
import { button } from '@jayobado/lolo-ui'

const btn = button(null, '⚙')

useTooltip(btn, {
  text: 'Settings',
  placement: 'top',
  styles: {
    background: '#333', color: '#fff', padding: '4px 8px',
    borderRadius: 4, fontSize: 12,
  },
})
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Tooltip text (required) |
| `placement` | `Placement` | `'top'` | Preferred position |
| `offset` | `number` | `8` | Gap between trigger and tooltip in px |
| `showDelay` | `number` | `200` | Delay before showing in ms |
| `hideDelay` | `number` | `100` | Delay before hiding in ms |
| `class` | `string` | — | CSS class on tooltip |
| `styles` | `StyleObject` | — | Atomic CSS on tooltip |

### `useDropdown` — accessible dropdown menu

```typescript
import { useDropdown } from '@jayobado/lolo-ui/hooks'
import { button } from '@jayobado/lolo-ui'

const btn = button(null, 'Actions')

const { toggle, isOpen } = useDropdown(btn, {
  items: [
    { label: 'Edit', onSelect: () => edit() },
    { label: 'Duplicate', onSelect: () => duplicate() },
    { label: 'Archive', disabled: true },
    { label: 'Delete', onSelect: () => remove() },
  ],
  placement: 'bottom',
  styles: {
    background: '#1a1a2e', border: '1px solid #333', borderRadius: 6,
    minWidth: 160, overflow: 'hidden',
  },
  itemStyles: { padding: '8px 12px' },
  activeItemStyles: { background: '#2a2a3e' },
  disabledItemStyles: { opacity: 0.4, cursor: 'not-allowed' },
})

btn.addEventListener('click', () => toggle())
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `items` | `DropdownItem[]` | — | Menu items (required) |
| `placement` | `Placement` | `'bottom'` | Preferred position |
| `offset` | `number` | `4` | Gap between trigger and menu in px |
| `class` | `string` | — | CSS class on menu container |
| `styles` | `StyleObject` | — | Atomic CSS on menu container |
| `itemClass` | `string` | — | CSS class on each item |
| `itemStyles` | `StyleObject` | — | Atomic CSS on each item |
| `activeItemStyles` | `StyleObject` | — | Styles for keyboard/hover active item |
| `disabledItemStyles` | `StyleObject` | — | Styles for disabled items |
| `onSelect` | `(item) => void` | — | Called when any item is selected |

#### DropdownItem

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Display text |
| `value` | `string` | Optional value for `onSelect` |
| `disabled` | `boolean` | Prevents selection |
| `onSelect` | `() => void` | Per-item callback |

#### Return values

| Property | Type | Description |
|---|---|---|
| `open` | `() => void` | Open the dropdown |
| `close` | `() => void` | Close the dropdown |
| `toggle` | `() => void` | Toggle open/close |
| `isOpen` | `Signal<boolean>` | Whether dropdown is open |
| `dispose` | `() => void` | Close and clean up |

## Project structure
```
my-app/
├── server.ts
├── deno.json
└── public/
    ├── main.ts
    ├── tokens.ts
    ├── services/
    │   └── app.ts
    └── views/
        ├── HomeView.ts
        ├── LoginView.ts
        └── dashboard/
            ├── DashboardLayout.ts
            └── DashboardView.ts
```

## Working with kiln

`lolo-ui` is designed to be served by [kiln](https://github.com/jayobado/kiln) (v0.1.8+) which handles TypeScript transpilation, import specifier rewriting, HMR, and deployment builds. kiln reads your `deno.json` import map and `deno.lock`, rewrites bare specifiers like `@jayobado/lolo-ui` to versioned `/jsr/` paths, and serves the transpiled modules from jsr.io on demand.

```json
{
  "imports": {
    "@jayobado/kiln": "jsr:@jayobado/kiln@^0.1.8",
    "@jayobado/lolo-ui": "jsr:@jayobado/lolo-ui@^0.1.9"
  }
}
```

## Versioning
```bash
deno run --allow-read --allow-write scripts/bump.ts v0.2.0
```

## License

MIT