# ts-ui-tools

An SPA framework toolkit for building dashboards and data-heavy UIs in pure TypeScript. No build step. No JSX. No virtual DOM. Runs natively in Deno and the browser as ES modules.

## What it provides

- **Signals** — fine-grained reactive primitives (`signal`, `computed`, `effect`, `batch`)
- **DOM** — typed element factories that build real DOM nodes directly (`div`, `span`, `button`, `input` etc.)
- **CSS** — atomic CSS-in-JS engine with pseudo-class and media query support
- **Components** — `defineComponent` with scoped lifecycle and auto-disposed effects
- **Router** — client-side routing with params, guards, nested layouts, query strings
- **Services** — pluggable data layer with typed adapters for tRPC, REST, and Connect-RPC

## What it is not

- A meta framework — no SSR, no file-based routing, no build pipeline
- An opinion on your backend
- A dependency on any other UI framework

## Requirements

- Deno 1.40+ or a modern browser with ES module support
- A server to serve your TypeScript files (see [ts-hono](https://github.com/yourname/ts-hono))

## Installation

### Deno

Add to your project's `deno.json`:
```json
{
  "imports": {
    "@ts-ui": "https://raw.githubusercontent.com/yourname/ts-ui/v0.1.0/mod.ts"
  }
}
```

Set your GitHub token for private repo access:
```bash
export DENO_AUTH_TOKENS="ghp_yourtoken@raw.githubusercontent.com"
```

### Browser (import map, no bundler)
```html
<script type="importmap">
{
  "imports": {
    "@ts-ui-tools": "https://raw.githubusercontent.com/jayobado/ts-ui-tools/v0.1.0/mod.ts"
  }
}
</script>
<script type="module" src="/main.ts"></script>
```

> Requires a server that transpiles `.ts` files — see [ts-hono](https://github.com/yourname/ts-hono).

### Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@ts-ui-tools': '/path/to/ts-ui-tools/mod.ts',
    },
  },
})
```
```typescript
// main.ts
import { signal, defineComponent, createApp } from '@ts-ui'
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
    '@ts-ui-tools': './path/to/ts-ui-tools/mod.ts',
  },
})
```

### Node (18+)

`ts-ui-tools` uses browser APIs (`document`, `HTMLElement`, `EventSource`) so it needs a DOM environment on Node. Use with [happy-dom](https://github.com/capricorn86/happy-dom) or [jsdom](https://github.com/jsdom/jsdom) for testing, or just bundle it for the browser with Vite or esbuild — the Node process only needs to run the build, not the UI itself.
```bash
npm install ts-ui-tools   # if published to npm
# or
npm install ./path/to/ts-ui-tools
```
```typescript
import { signal, defineComponent } from 'ts-ui'
```

### Bun
```bash
bun add ./path/to/ts-ui
```
```typescript
import { signal, defineComponent } from 'ts-ui'
```

---

## Compatibility

| Environment | Supported | Notes |
|---|---|---|
| Deno | ✓ | Native — recommended |
| Modern browsers | ✓ | Via import map or bundler |
| Vite | ✓ | Use path alias |
| esbuild | ✓ | Use alias option |
| Bun | ✓ | No DOM — bundle for browser |
| Node 18+ | ✓ | No DOM — bundle for browser |

> `ts-ui` has zero external dependencies. It is pure TypeScript using only browser APIs. It runs anywhere those APIs are available.

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
} from '@ts-ui-tools'

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
import { signal, computed, effect, batch } from '@ts-ui'

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
} from '@ts-ui'

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
import { defineComponent, signal, div, span, button } from '@ts-ui'

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

// Use it — returns an HTMLElement
const card = UserCard({ name: 'Jane', role: 'Admin' })
document.body.appendChild(card)
```

### `ComponentContext`

| Method | Description |
|---|---|
| `onMount(fn)` | Called after the component is added to the DOM |
| `onUnmount(fn)` | Called before the component is removed from the DOM |
| `effect(fn)` | Reactive effect scoped to this component's lifetime |

### `h()` — mount a component
```typescript
import { h } from '@ts-ui'

// Typed props from component definition
const el = h(UserCard, { name: 'Jane', role: 'Admin' })
```

## CSS

The CSS engine generates atomic class names from style objects and injects rules into a `<style>` tag in `<head>`. Identical property+value pairs always share the same class — rules are never duplicated.

### `css()` — reactive styles
```typescript
import { css } from '@ts-ui'

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

## Router
```typescript
import { createApp } from '@ts-ui'

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
import { Services } from '@ts-ui'

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
import { configureServices, Adapters } from '@ts-ui'
import { appServices }                  from './services/app.ts'

configureServices(
  Adapters.createTrpcAdapter(appServices, {
    baseUrl: '/api',
  })
)
```

### Using services in a view
```typescript
import { defineComponent, signal, div } from '@ts-ui'
import { useServices }                   from '@ts-ui'
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
import { Adapters } from '@ts-ui'

// tRPC — works with ts-hono server-side tRPC bridge
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
import type { Transport } from '@ts-ui'

const myTransport: Transport = {
  query:     (path, input) => myClient.get(path, input),
  mutate:    (path, input) => myClient.post(path, input),
  subscribe: (path, input, callbacks) => myClient.stream(path, input, callbacks),
}
```

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

## Working with ts-hono

`ts-ui` is designed to be served by [ts-hono](https://github.com/yourname/ts-hono) which handles TypeScript transpilation, static file serving, and tRPC integration.
```typescript
// server.ts
import { ui } from '@ts-hono'

await ui({
  host:      'localhost',
  port:      3000,
  fsRoot:    './public',
  importMap: './deno.json',
  strategy:  'lazy',
})
```

## Versioning
```bash
deno run --allow-read --allow-write scripts/bump.ts v0.2.0
```

## License

MIT
