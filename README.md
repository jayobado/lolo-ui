# ts-ui

A lightweight full-stack SPA framework for building dashboards and data-heavy UIs in pure TypeScript. No build step. No JSX. No virtual DOM. Runs natively in Deno and the browser as ES modules.

## What it is

- **Signals** — fine-grained reactive primitives (`signal`, `computed`, `effect`, `batch`)
- **DOM** — typed element factories (`div`, `span`, `button`, `input` etc.) that build real DOM nodes
- **CSS** — atomic CSS-in-JS engine with pseudo-class and media query support
- **Components** — `defineComponent` with scoped lifecycle and auto-disposed effects
- **Router** — client-side routing with params, guards, nested layouts, query strings
- **Services** — pluggable data layer with typed adapters for tRPC, REST, and Connect-RPC

## What it is not

- A meta framework (no SSR, no file-based routing, no build pipeline)
- An opinion on your backend
- A dependency on any other UI framework

## Installation

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

## Quick start
```typescript
// public/main.ts
import {
  createApp,
  defineComponent,
  signal,
  div, h1, button, span,
  css,
} from '@ts-ui'

const Counter = defineComponent((_props, { effect }) => {
  const count = signal(0)

  const countEl = span(null, '0')

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

## Signals
```typescript
import { signal, computed, effect, batch } from '@ts-ui'

// signal — reactive value
const count = signal(0)
count.get()              // read
count.set(1)             // write
count.update(n => n + 1) // update from current value

// computed — derived value, updates automatically
const doubled = computed(() => count.get() * 2)
doubled.get() // 2

// effect — runs when dependencies change, returns dispose fn
const dispose = effect(() => {
  console.log('count is', count.get())
})
dispose() // stop tracking

// batch — multiple updates trigger effects only once
batch(() => {
  count.set(10)
  count.set(20) // effects fire once after batch completes
})
```

## DOM
```typescript
import { div, span, h1, button, input, form, a, table, tr, td } from '@ts-ui'
import { css } from '@ts-ui'

// Plain element
const el = div(null, 'Hello')

// With styles and class
const card = div({
  class:  'my-card',
  styles: {
    background:   '#1a1a2e',
    borderRadius: '8px',
    padding:      24,
    pseudo: {
      ':hover': { background: '#2a2a3e' }
    },
    media: {
      '(max-width: 768px)': { padding: 12 }
    }
  }
}, 'Content')

// Event handlers
const btn = button({
  onClick: () => console.log('clicked'),
}, 'Click me')

// Dynamic class via css()
const active = true
const el2 = div({
  class: `base-class ${active ? css({ color: 'white' }) : ''}`
})
```

## CSS
```typescript
import { css } from '@ts-ui'

// Returns a class string — rules injected into <style> tag
const className = css({
  display:      'flex',
  gap:          16,
  padding:      '12px 24px',
  background:   '#1a1a2e',
  borderRadius: 8,

  // Pseudo-classes
  pseudo: {
    ':hover':    { background: '#2a2a3e' },
    ':focus':    { outline: '2px solid #d4952a' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },

  // Media queries
  media: {
    '(max-width: 768px)': { padding: '8px 16px' },
    '(prefers-color-scheme: light)': { background: '#ffffff' },
  },
})

// Apply to an element
const el = div({ class: className }, 'Styled')

// Mix with existing classes
const el2 = div({ class: `existing-class ${className}` }, 'Mixed')
```

## Components
```typescript
import { defineComponent, signal, div, span, button } from '@ts-ui'

const UserCard = defineComponent<{ name: string; role: string }>(
  (props, { onMount, onUnmount, effect }) => {
    const expanded = signal(false)

    const detailEl = span(null, '')

    // effect is scoped — disposed automatically on unmount
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
        onClick: () => expanded.update(v => !v)
      }, 'Toggle'),
    )
  }
)

// Use it
const card = UserCard({ name: 'Jane', role: 'Admin' })
```

## Router
```typescript
import { createApp } from '@ts-ui'

// Auth guard
const requiresAuth = async () => {
  const token = localStorage.getItem('token')
  return token ? true : '/login'
}

createApp({
  mountPoint: '#app',

  routes: [
    // Public
    { path: '/',      view: (ctx) => HomeView(ctx) },
    { path: '/login', view: (ctx) => LoginView(ctx) },

    // Named params
    { path: '/users/:id', view: (ctx) => UserView(ctx) },
    // ctx.params.id

    // With guard
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
    // runs once before first route renders
  },
}).init()
```
```typescript
// Reading params and query strings inside a view
import { defineComponent } from '@ts-ui'

const UserView = defineComponent<{ params: { id: string }; query: { tab?: string } }>(
  (props, { onMount }) => {
    // props.params.id   → from /users/:id
    // props.query.tab   → from ?tab=settings
    ...
  }
)
```

## Services

Define your service contract once. Swap the transport without touching your views.
```typescript
// services/app.ts
import { Services } from '@ts-ui'
const { defineServices, query, mutation, subscription } = Services

export interface User { id: string; name: string; email: string }

export const appServices = defineServices({
  users: {
    list:   query<{ page?: number }, User[]>('users/list'),
    create: mutation<Omit<User, 'id'>, User>('users/create'),
  },
  metrics: {
    live: subscription<void, { rps: number; latency: number }>('metrics/live'),
  },
})

export type AppServices = typeof appServices
```
```typescript
// main.ts — configure once
import { configureServices, Adapters } from '@ts-ui'
import { appServices }                 from './services/app.ts'

configureServices(
  Adapters.createTrpcAdapter(appServices, {
    baseUrl:    '/api',
    getHeaders: () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` }),
  })
)
```
```typescript
// Any view — call services, never touch the adapter
import { defineComponent, signal, div } from '@ts-ui'
import { useServices }                  from '@ts-ui'
import type { AppServices }             from './services/app.ts'

const UsersView = defineComponent((_props, { onMount, effect }) => {
  const users   = signal<User[]>([])
  const loading = signal(true)

  const services = useServices<AppServices>()

  onMount(async () => {
    const result = await services.users.list({ page: 1 })
    users.set(result)
    loading.set(false)
  })

  const container = div({ styles: { padding: 24 } })

  effect(() => {
    if (loading.get()) {
      container.textContent = 'Loading...'
      return
    }
    container.replaceChildren(
      ...users.get().map(u => div(null, u.name))
    )
  })

  return container
})
```

### Available adapters
```typescript
import { Adapters } from '@ts-ui'

// tRPC bridge (/api/* routes via ts-hono)
Adapters.createTrpcAdapter(services, {
  baseUrl:    '/api',
  getHeaders: () => ({ Authorization: `Bearer ${token}` }),
})

// Plain REST
Adapters.createRestAdapter(services, {
  baseUrl:   'https://api.example.com',
  methodMap: { 'users/delete': 'DELETE', 'users/update': 'PATCH' },
})

// Connect-RPC / gRPC-Web via Envoy
Adapters.createConnectAdapter(services, {
  baseUrl:  'https://grpc.example.com',
  protocol: 'grpc-web',
})
```

### Custom adapter

Implement the `Transport` interface to support any backend:
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
        └── dashboard/
            ├── DashboardLayout.ts
            └── UsersView.ts
```

## Versioning
```bash
# Bump project to a new ts-ui release
deno run --allow-read --allow-write scripts/bump.ts v0.2.0
```

## License

MIT
