# lolo-ui

A small TypeScript UI toolkit for building real-DOM applications. Lean,
opinionated, dependency-light, and centered on a signals-based reactive model.

## What is lolo-ui

lolo-ui is the UI foundation for backend-developer-built frontends. It targets
the kind of work where you're shipping internal dashboards, admin tools, and
business applications — not consumer-facing marketing sites or design-system
showcases. It exists because the popular options either bring too much (React's
ecosystem and rendering model), demand too much commitment (Svelte's
build-time transformation), or don't quite fit how a backend dev wants to think
about UI (Vue's templates).

The toolkit gives you:

- A reactive primitive — `signal()`, `effect()`, `computed()` — that drives
  everything else.
- Lifecycle scopes — every container has a scope; effects, queries, and
  subscriptions clean up when the scope disposes.
- A real-DOM container system — containers are factories that take a setup
  function (returns state) and a content function (returns an `HTMLElement`).
  No virtual DOM, no reconciliation step.
- A small declarative layer — forms, tables, multi-row sections, and multi-step
  flows expressed as data structures rather than ad-hoc DOM construction.
- Async data hooks — `useQuery` and `useMutation` for fetch-into-signals
  patterns.
- A trimmed set of low-level primitives — click-outside, focus traps, scroll
  locks, media queries, debounce, intervals, portals, toast, tooltip.
- A router built around containers, with route guards and meta.

It's a toolkit, not a framework. You wire it together yourself; lolo-ui won't
make decisions for you about routing structure, state management beyond
signals, or styling. The pieces compose and you bring them together.

## What lolo-ui isn't

To be honest about what you're getting and what you aren't:

- **Not a React replacement** in the general sense. If you need component
  ecosystems, server-side rendering, React Native, or anything that depends on
  the React mental model — this isn't that.
- **Not a complete CSS or design system.** lolo-ui produces real DOM elements
  with class names; you bring the CSS. No styled-components, no Tailwind
  integration baked in, no design tokens.
- **Not an RPC layer.** The toolkit doesn't ship adapters for tRPC, REST, or
  Connect. Bring your own client — `useQuery` and `useMutation` wrap any
  Promise-returning function, so they work with whatever you already use.
- **Not type-safe end-to-end across the wire.** Type safety stops where your
  Promise-returning function ends. If you want full-stack types, generate
  Connect/tRPC clients separately and call them through `useQuery`.
- **Not optimized for very large interactive surfaces.** Real-DOM rendering is
  fast for typical dashboard sizes but loses to virtualized React or Solid for
  10,000-row tables. lolo-ui isn't designed for those cases.
- **Not stable.** This is a personal toolkit. APIs change when better designs
  surface.

## Who it's for

You'll likely enjoy lolo-ui if:

- You write your own backend (Go, Rust, Elixir — anything strongly typed) and
  want the frontend to be a thin window into it.
- You'd rather see the actual DOM than think about virtual-DOM reconciliation.
- You like lightweight tools where you can read the source in a sitting.
- You don't want a build step beyond TypeScript transpilation.

You'll likely find it frustrating if:

- You expect a large component library with prebuilt date pickers, tables, and
  rich text editors.
- You want server-side rendering or hydration.
- You need an ecosystem of compatible libraries.
- You want a framework that makes most decisions for you.

## Installation

lolo-ui is published on [JSR](https://jsr.io) and designed to run in browsers
via a bundler that handles `.ts` imports and JSR/npm specifiers.

### With Deno + JSR

Add to your `deno.json`:

```jsonc
{
  "imports": {
    "@jayobado/lolo-ui":            "jsr:@jayobado/lolo-ui@^0.3.0",
    "@jayobado/lolo-ui/dsl":        "jsr:@jayobado/lolo-ui@^0.3.0/dsl",
    "@jayobado/lolo-ui/query":      "jsr:@jayobado/lolo-ui@^0.3.0/query",
    "@jayobado/lolo-ui/hooks":      "jsr:@jayobado/lolo-ui@^0.3.0/hooks",
    "@jayobado/lolo-ui/primitives": "jsr:@jayobado/lolo-ui@^0.3.0/primitives"
  }
}
```

Import paths follow the subpath structure. The root export covers the core
(signals, scope, container, router, app, `h()`). Each subpath is its own
focused slice of functionality — see [Subpath reference](#subpath-reference).

### Compiler options

lolo-ui assumes strict TypeScript with DOM types available. In your `deno.json`:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "lib": ["ESNext", "DOM"]
  }
}
```

### What you bring

lolo-ui doesn't ship a build step. You'll need:

- A bundler/dev server that handles TypeScript and JSR/npm specifiers.
- An HTML entry point that loads your compiled JavaScript.
- CSS. lolo-ui produces real DOM elements with class names (e.g. `.lolo-form`,
  `.lolo-table`); the visual layer is yours to define.
- Your own RPC client if you talk to a backend. `useQuery` and `useMutation`
  wrap any Promise-returning function.

## Quick start

A complete lolo-ui app, minus the HTML page and CSS:

```typescript
import { defineContainer, createApp, h } from '@jayobado/lolo-ui'
import { useMutation } from '@jayobado/lolo-ui/query'
import { defineForm, renderForm } from '@jayobado/lolo-ui/dsl'

// Your own RPC client — lolo-ui doesn't care what this is, as long as
// the methods return Promises. This could be a Connect client, a tRPC
// client, or a hand-rolled fetch wrapper.
import { api } from './lib/api.ts'

interface Note {
	title: string
	body:  string
}

const newNoteContainer = defineContainer({
	route: { path: '/notes/new', title: 'New note' },

	setup() {
		const createNote = useMutation((input: Note) => api.notes.create(input))
		return { createNote }
	},

	content: ({ createNote }) => {
		const root = h('div', { class: 'page' })

		root.append(h('h1', null, 'New note'))

		const form = renderForm(defineForm<Note>({
			type:    'form',
			initial: { title: '', body: '' },
			onSubmit: async (state) => {
				await createNote.mutate(state)
				// Navigate, show toast, etc.
			},
			children: [
				{ type: 'input',    name: 'title', label: 'Title', required: true },
				{ type: 'textarea', name: 'body',  label: 'Body',  rows: 5 },
				{ type: 'button',   label: 'Save', action: 'submit' },
			],
		}))

		root.append(form)
		return root
	},
})

const app = createApp({
	containers: [newNoteContainer],
})

app.mount(document.getElementById('app')!)
```

What's happening:

- **`defineContainer`** declares a route-bound view. The `setup` function runs
  when the container mounts; it returns state and helpers that `content`
  receives. The container's scope automatically cleans up when navigation
  moves away.
- **`useMutation`** wraps a Promise-returning function, exposing `data`,
  `error`, `loading` as signals plus a `mutate()` method that fires the call.
- **`renderForm`** + **`defineForm`** are the form DSL. The form's state lives
  internally; `onSubmit` fires with the validated state.
- **`createApp`** wires containers into a routed app. `app.mount(el)` attaches
  the app's root to a real DOM node.

This is roughly the smallest "real" lolo-ui app. From here you'd add more
containers, build out tables and lists with the declarative layer, use
`useQuery` for data fetching, and lean on hooks like `useModal` and
`useDropdown` for transient UI.

## Where to go next

- **[Concepts](docs/concepts.md)** — signals, scope, containers. The mental
  model that everything else is built on.
- **[The declarative layer](docs/declarative.md)** — forms, tables, multi-row
  sections, and multi-step flows.
- **[Subpath reference](docs/subpaths.md)** — what each subpath exports at a
  glance.
- **[Examples](docs/examples.md)** — signup forms, login forms, expense
  entry, search boxes. Real shapes from real apps.
- **[Patterns](docs/patterns.md)** — app-level patterns lolo-ui doesn't
  ship: dialogs, nav menus, dropdown menus, route-aware links.

## License

MIT. See [LICENSE](LICENSE).