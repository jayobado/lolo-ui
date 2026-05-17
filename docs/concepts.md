# Concepts

lolo-ui rests on three primitives: **signals** for reactivity, **scope** for
lifecycle, and **containers** for the unit of UI. Plus one utility — **`h()`**
— for building DOM. Understanding these is the bulk of understanding lolo-ui.

Read top to bottom. Each builds on the previous.

## Signals

A signal is a value that knows when it's read and when it's changed. When you
create a signal, you get something with three methods:

```typescript
import { signal } from '@jayobado/lolo-ui'

const count = signal(0)

count.get()      // → 0
count.set(5)
count.get()      // → 5
count.update((n) => n + 1)
count.get()      // → 6
```

So far, this is just a variable with extra ceremony. The interesting part is
**effects** — functions that re-run automatically when the signals they read
change.

```typescript
import { signal, effect } from '@jayobado/lolo-ui'

const count = signal(0)

effect(() => {
	console.log('Count is:', count.get())
})
// → logs: "Count is: 0"

count.set(5)
// → logs: "Count is: 5"

count.set(10)
// → logs: "Count is: 10"
```

The `effect` ran once immediately (logging `0`), then ran again each time
`count.set()` changed the value. The function inside `effect` automatically
subscribed to `count` because it called `count.get()`.

### How tracking works

When an effect is running, there's a notion of a "current effect." When any
signal's `get()` is called during that window, the signal silently records the
effect as a subscriber. Later, when the signal's `set()` is called, every
subscribed effect is notified.

This is why **you must call `.get()` inside effects to establish reactivity.**
Reading a signal's value through another reference, or destructuring outside
the effect, breaks the tracking. Two examples of getting this wrong:

```typescript
// Wrong: reads value once, doesn't track
const value = count.get()
effect(() => {
	console.log('Count is:', value)   // never updates
})

// Wrong: still doesn't track — the closure captures the function, not the read
effect(() => {
	const reader = count.get
	console.log('Count is:', reader())   // never updates after first run
})

// Right: get() is called inside the effect body
effect(() => {
	console.log('Count is:', count.get())   // updates correctly
})
```

The mental model: an effect tracks every signal whose `.get()` runs *during*
its body, not before it.

### Computed values

Often you want a value derived from other signals — a sum, a filtered list, a
transformed string. That's `computed`:

```typescript
import { signal, computed } from '@jayobado/lolo-ui'

const firstName = signal('Ada')
const lastName  = signal('Lovelace')
const fullName  = computed(() => `${firstName.get()} ${lastName.get()}`)

fullName.get()           // → 'Ada Lovelace'
firstName.set('Grace')
fullName.get()           // → 'Grace Lovelace'
```

A `computed` returns something with a `.get()` method that always reflects the
latest value derived from its inputs. Under the hood, it's a signal plus an
effect — the effect re-runs when the inputs change, updating the signal that
the `.get()` reads from.

### Batching

When you want to update several signals together and have effects fire only
once at the end, wrap the changes in `batch`:

```typescript
import { batch } from '@jayobado/lolo-ui'

batch(() => {
	firstName.set('Alan')
	lastName.set('Turing')
})
// Effects subscribed to either signal fire once, after both changes.
```

Without `batch`, the effect would run twice — once after each `.set()`. With
`batch`, it runs once when the batch closes. Useful when you're updating
several pieces of state together and don't want intermediate states to be
observable.

### Disposing effects

`effect()` returns a function that, when called, unsubscribes that effect from
all its signal dependencies:

```typescript
const dispose = effect(() => {
	console.log('Count:', count.get())
})

count.set(5)   // logs
dispose()
count.set(10)  // doesn't log — effect is gone
```

You'll rarely call `dispose` manually. In practice, effects are created inside
scopes, and the scope handles disposal for you. That's the next concept.

## Scope

A scope is a container for resources that should be cleaned up together. When
you dispose a scope, every effect, query, and cleanup callback registered to
it gets torn down.

The most important thing scopes give you: **automatic cleanup when a piece of
UI goes away.** When the user navigates from one route to another, the
previous container's scope disposes — and every effect, every running query,
every event listener registered to that scope cleans itself up.

You won't usually create a scope directly. Containers create them for you;
forms create child scopes; the array DSL node creates per-row sub-scopes. But
it helps to understand how they work.

### Creating and using a scope

```typescript
import { createScope, runInScope, getScope } from '@jayobado/lolo-ui'

const scope = createScope()

runInScope(scope, () => {
	// Inside this block, getScope() returns the scope above.
	scope.effect(() => {
		console.log('hello')
	})
})

// Later:
scope.dispose()   // tears down everything registered to it
```

`createScope()` produces a `Scope` with three methods:

- `scope.effect(fn)` — register a reactive effect that's automatically disposed
  when the scope disposes.
- `scope.onCleanup(fn)` — register an arbitrary cleanup callback (close a
  WebSocket, cancel an animation, etc.).
- `scope.dispose()` — fire all registered cleanups in order.

`runInScope(scope, fn)` makes `scope` the **ambient scope** while `fn` runs.
Code inside can call `getScope()` to retrieve it without threading the scope
through every function call.

### Why the ambient scope matters

Functions that *want* to create effects can use the ambient scope without
needing it passed in:

```typescript
function makeCounterDisplay(label: string): HTMLElement {
	const el = document.createElement('div')
	const scope = getScope()!   // assumes we're inside a runInScope block
	scope.effect(() => {
		el.textContent = `${label}: ${someSignal.get()}`
	})
	return el
}
```

The function doesn't know which scope it's running in — only that there is
one. The caller controls lifetime; the helper just registers its effect into
whatever ambient scope is active. This is how containers, forms, and DSL
nodes manage cleanup without passing scopes around explicitly.

### Nesting

Scopes don't nest automatically. If you create a child scope inside another
scope, the child won't dispose when the parent does — unless you wire it up:

```typescript
const parent = createScope()
const child  = createScope()

parent.onCleanup(() => child.dispose())
```

In practice, lolo-ui's own internals handle this for you — forms create child
scopes that dispose with the parent container, and array rows create grandchild
scopes that dispose when the row goes away.

## Containers

A container is the unit of UI in lolo-ui. One container per route, typically.
Each one is a factory: given a route match, it produces a setup result and a
DOM element, with a scope that lives for the duration of the visit.

### Anatomy

```typescript
import { defineContainer, h } from '@jayobado/lolo-ui'

const homeContainer = defineContainer({
	route: { path: '/', title: 'Home' },

	setup() {
		const message = signal('Hello, world')
		return { message }
	},

	content: ({ message }) => {
		const root = h('div', { class: 'home' })
		const heading = h('h1', null, message.get())
		root.append(heading)
		return root
	},
})
```

Three things:

**`route`** is the routing metadata — at minimum, a path. It can also include
`title` (sets document title on mount), `guards` (functions that block
navigation), and `meta` (arbitrary data accessible to the rest of the app).

**`setup`** runs once when the container mounts. It returns the container's
state — signals, helpers, query results, anything the content function will
need. The return value is passed to `content` as its argument.

**`content`** runs once after setup. It builds the DOM and returns the root
element. Inside content, you build real DOM with `h()`, register effects (via
the ambient scope), and append it all together.

The container's scope wraps both `setup` and `content`. Any signal subscriptions
registered during either phase live until the user navigates away.

### Why setup and content are separate

You could combine them — one function that returns DOM. lolo-ui doesn't, for
two reasons.

First, **state outlives DOM rebuilds.** If something causes the content to
re-render (rare, but possible in some patterns), setup's state stays put. The
state and the DOM have different lifetimes; separating them respects that.

Second, **content benefits from receiving named state.** Destructuring the
setup result in content's parameter list makes the dependencies obvious:

```typescript
content: ({ users, loading, refetch }) => {
	// content code uses `users`, `loading`, `refetch` — all visible at a glance
}
```

If setup and content were combined, the dependencies would be in scope by
closure, less explicit.

### The scope's lifetime

The container's scope is created when the route mounts the container and
disposed when the route navigates away (or when the app unmounts). Everything
that registers cleanup inside the container — effects, `useQuery`'s
auto-refetch, `useModal`'s portal — disposes automatically.

You almost never call `scope.dispose()` yourself. The router and `createApp`
manage container scope lifetimes for you.

### Route guards

A guard is a function that decides whether the route can be entered. Return
`true` to allow, `false` to block, or a redirect path to navigate elsewhere:

```typescript
const adminContainer = defineContainer({
	route: {
		path:  '/admin',
		title: 'Admin',
		guards: [
			() => isLoggedIn() || '/login',
			() => isAdmin()    || '/forbidden',
		],
	},
	setup() { /* ... */ },
	content() { /* ... */ },
})
```

Guards run in order before the container's `setup` is called. If any guard
returns a string, the router navigates there instead.

### Route meta

If you need to attach arbitrary data to a route — required permissions, sidebar
icon, breadcrumb info — use `meta`:

```typescript
const reportsContainer = defineContainer({
	route: {
		path:  '/reports',
		title: 'Reports',
		meta:  { icon: 'chart-bar', section: 'analytics' },
	},
	setup() { /* ... */ },
	content() { /* ... */ },
})
```

Other parts of your app (e.g., a sidebar component reading the current route)
can access `route.meta` to render appropriately.

## `h()`

`h()` is lolo-ui's helper for building DOM. It's not framework-magic — it just
calls `document.createElement` and sets properties — but it's wrapped in
typings that make common DOM building less awkward than plain JavaScript.

### Basic shape

```typescript
import { h } from '@jayobado/lolo-ui'

const button = h('button', { class: 'btn', type: 'button' }, 'Click me')
```

Three arguments:

1. **Tag name** — any standard HTML tag.
2. **Props** — an object of attributes/properties to set on the element. Pass
   `null` if there are no props.
3. **Children** — strings (become text nodes), HTMLElements (appended as-is),
   or arrays of the above. Variadic — pass as many as you need.

### Typed props per tag

The `h()` function is typed: when you write `h('input', { ... })`, the props
object accepts only valid `<input>` attributes (`type`, `name`, `value`,
`placeholder`, etc., plus event handlers like `onInput`). Same for
`h('a', { ... })` — it accepts `href` and other anchor-specific props.

This isn't React JSX — there's no transpilation step, and the values you set
are real DOM properties, not synthetic. Setting `disabled: true` on a button
sets the actual `disabled` property; setting `onClick: fn` calls
`addEventListener('click', fn)`.

### Mixing reactivity

`h()` itself isn't reactive — it builds DOM once when called. To make an
element react to signals, register an effect that updates the element:

```typescript
const count = signal(0)

const display = h('span', { class: 'count' }, '')
getScope()!.effect(() => {
	display.textContent = String(count.get())
})
```

The element exists in the DOM from the moment `h()` returns; the effect
keeps it in sync with the signal. This is the lolo-ui pattern in microcosm —
build DOM once, register effects to update it.

### Children patterns

Children can be flat or nested:

```typescript
// Flat — multiple arguments
h('ul', null,
	h('li', null, 'one'),
	h('li', null, 'two'),
	h('li', null, 'three'),
)

// From an array — usually when mapping data
h('ul', null,
	items.map((item) => h('li', null, item.label)),
)
```

Either works. The array form is common when iterating over data.

---

## Putting it together

These four primitives — signals, scope, containers, `h()` — are the foundation.
Almost everything else in lolo-ui is built from them:

- The DSL nodes use signals for state, scope for cleanup, and `h()`
  internally to build their DOM.
- `useQuery` and `useMutation` are signals (`data`, `error`, `loading`) plus
  effects that fire the async function and re-run when dependencies change.
- The router manages container scopes — creating one when a route mounts,
  disposing it when navigation moves away.
- `useModal` and `useDropdown` register cleanup callbacks on the ambient scope
  so that portals and event listeners go away when their container does.

Read the rest of the docs assuming these concepts are settled. The declarative
layer doc covers how the form/table/array/steps DSL nodes work; the patterns
doc covers app-level helpers built on top of these primitives.