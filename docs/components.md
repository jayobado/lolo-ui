# Authoring components

`0.4.0` added a variadic VNode authoring surface alongside the existing `h()`
primitive. The new shape — `el.*`, `svg.*`, `defineComponent`, `mount`, `when`,
`each` — produces VNodes that the renderer walks once to build DOM and bind
signals.

This doc covers what it is, when to use it, and how it composes with the rest
of lolo-ui. Read [Concepts](concepts.md) first if you haven't — signals,
scope, and the container model are assumed.

## Why a new surface

The existing approach builds DOM imperatively with `h()` and registers
reactivity by hand with `scope.effect`:

```typescript
const wrapper = h('div', { class: 'form-field' })
const input   = h('input', { type: 'text' })
scope.effect(() => {
	input.value = state.email.get() ?? ''
})
input.addEventListener('input', (e) => {
	state.email.set((e.target as HTMLInputElement).value)
})
wrapper.append(input)
```

It works. The form DSL is built on this pattern and handles forms beautifully.

But for hand-written components — custom views inside containers, glue between
DSL pieces, anything with conditional sections or reactive lists — the
imperative pattern adds friction. Reactivity wiring sits between structural
construction. Cleanup is implicit (the scope handles it, but you have to know
the rules). Per-element prop typing isn't there.

The new surface trades a slight runtime cost (each call site allocates a
VNode) for declarative reactivity, typed props, and structural composition.
Same component, declaratively:

```typescript
import { el, when } from '@jayobado/lolo-ui'
const { div, input, p } = el

return div({ class: 'form-field' },
	input({
		type: 'text',
		value: () => state.email.get() ?? '',
		onInput: (e) => state.email.set((e.target as HTMLInputElement).value),
	}),
	when(
		() => !!errors.email?.get(),
		() => p({ class: 'form-error' }, () => errors.email!.get()),
	),
)
```

No `scope.effect` calls in user code. Reactivity is implicit in thunks. Event
cleanup is handled by the renderer.

Both surfaces remain. Use whichever fits.

## Quick start

```typescript
import { defineComponent, el, mount, signal, when } from '@jayobado/lolo-ui'

const { div, h2, button } = el

const Counter = defineComponent<{ initial?: number }>((props) => {
	const count = signal(props.initial ?? 0)

	return div({ class: 'counter' },
		h2('Count: ', count),
		button(
			{ onClick: () => count.update(n => n + 1) },
			'Increment',
		),
		when(
			() => count.get() > 10,
			() => div({ class: 'warn' }, 'High!'),
		),
	)
})

// In a container's content function, or anywhere you have a parent element:
mount(Counter({ initial: 0 }), document.querySelector('#app')!)
```

## Element factories

Every HTML element is available as a typed factory on the `el` namespace:

```typescript
import { el } from '@jayobado/lolo-ui'
const { div, span, h2, button, input, label, ul, li, form } = el
```

The destructure-at-top pattern is the recommended idiom. The `el.` prefix
works too — `el.div(...)` and the destructured `div(...)` produce identical
VNodes.

### Calling conventions

Factories accept three call shapes:

```typescript
div()                          // no props, no children
div({ class: 'card' })         // props only
div('hello world')             // no props, one or more children
div({ class: 'x' }, 'hello')   // props plus children
```

The first argument is treated as props if it's a plain object that isn't
a VNode, signal, array, function, or DOM node. Bare strings, numbers, signals,
and VNodes always count as children. A bare `{}` is treated as empty props.

If you ever need to pass an arbitrary object as a child, wrap it in something
the renderer recognizes — usually `String(obj)` or a VNode containing it.

### Per-element typed props

Each factory's props are typed to that element:

```typescript
button({ type: 'submit', disabled: false }, 'Save')
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ autocomplete
a({ href: '/x', target: '_blank' }, 'Open')
input({ type: 'email', value: emailSignal })
```

Typos and invalid values are caught at compile time:

```typescript
button({ type: 'send' })   // error: 'send' not assignable to button's type
a({ src: '/x' })            // error: 'src' is not a property of AnchorProps
input({ type: 'hyperlink' }) // error: not a valid input type
```

The full list: 88 HTML elements, 32 SVG elements (in the `svg` namespace),
plus the catch-all `data-*`, `aria-*`, and `on:event-name` patterns on every
element. See [Subpath reference](subpaths.md) for the exported prop interface
names if you want to type your own components.

### Reactive props

Props accept plain values, signals, or thunks. The renderer binds reactive
sources to the DOM property/attribute and updates it in place when the
source changes:

```typescript
input({
	value: emailSignal,                                    // signal — reactive
	placeholder: () => isRequired.get() ? 'Required' : '', // thunk — reactive
	disabled: false,                                       // plain — set once
})
```

No `effect()` wiring; the renderer reads the signal or runs the thunk inside
an effect of its own, owned by the surrounding component's scope.

The thunk form is useful when you need to combine signals or transform a value
before applying it:

```typescript
div({
	class: () => isActive.get() ? 'tab tab--active' : 'tab',
	style: () => ({ color: theme.get().fg }),
})
```

### Event handlers

Event handlers use the `onCamelCase` convention:

```typescript
button({
	onClick:      (e) => console.log(e),
	onMouseEnter: (e) => console.log(e),
	onKeyDown:    (e) => { if (e.key === 'Enter') save() },
}, 'Save')
```

The renderer detects `on` + capital-letter + rest as an event handler key,
strips the prefix, lowercases the rest, and registers via `addEventListener`.
The listener is unregistered when the surrounding scope disposes.

For custom event names (web components, anything with a hyphen or colon
that doesn't fit camelCase), use the explicit `on:` prefix with the literal
event name:

```typescript
slSelect({
	'on:sl-change': (e) => console.log(e.detail),
	'on:sl-input':  (e) => console.log(e.target.value),
})
```

Both forms work on any element; the `on:` form is more general.

### Children

Children are variadic. They can be:

- **Strings or numbers** — become text nodes.
- **Signals or thunks** — become reactive text nodes that update when the
  source changes.
- **VNodes** — produced by other factory calls; recursively mounted.
- **DOM nodes** — `HTMLElement` returned by `h()` or the form/table DSLs;
  appended directly. See [Interop](#interop-with-h-and-the-dsls) below.
- **Arrays** — flatten during mount.
- **`null`, `undefined`, `false`, `true`** — render nothing. Useful for
  short-circuit patterns: `condition && component()`.

A common shape — interleaving text and signals as children:

```typescript
h2('Count: ', count)
// Renders: <h2>Count: 0</h2>
// When count updates, only the "0" text node changes.
```

For structural reactivity (mount/unmount based on a signal), use `when` or
`each` — see [Control flow](#control-flow).

## Components

`defineComponent` wraps a function-of-props into a callable that produces a
component VNode:

```typescript
import { defineComponent, el } from '@jayobado/lolo-ui'
import type { Child } from '@jayobado/lolo-ui'

const { div, h2 } = el

interface CardProps {
	title:     string
	children?: Child[]
}

const Card = defineComponent<CardProps>((props) =>
	div({ class: 'card' },
		h2(props.title),
		...(props.children ?? []),
	)
)

// Call site:
Card({ title: 'Hello' }, el.p('body content'))
```

The component function runs once at mount time, inside a scope owned by its
parent. When the parent unmounts, the component's scope disposes — effects
clean up, event listeners detach. There's no re-render; reactivity flows
through signals and thunks the function captures in its closure.

### Children prop vs variadic children

Variadic children at the call site are collected into `props.children`:

```typescript
Card({ title: 'X' }, el.p('one'), el.p('two'))
// Inside Card: props.children === [el.p('one'), el.p('two')]
```

This means a component author can either splat children into a slot:

```typescript
const Card = defineComponent<CardProps>((props) =>
	div({ class: 'card' },
		h2(props.title),
		...(props.children ?? []),
	)
)
```

…or use them positionally with named slots if the layout has multiple
insertion points:

```typescript
interface PanelProps {
	header?: Child
	body:    Child
	footer?: Child
}

const Panel = defineComponent<PanelProps>((props) =>
	div({ class: 'panel' },
		props.header ? div({ class: 'panel-header' }, props.header) : null,
		div({ class: 'panel-body' }, props.body),
		props.footer ? div({ class: 'panel-footer' }, props.footer) : null,
	)
)

Panel({
	header: h2('Title'),
	body:   el.p('Body text'),
	footer: el.button({}, 'OK'),
})
```

Pick the shape that fits the component. Variadic children read naturally for
"container with arbitrary content"; named-prop slots are clearer for "panel
with specific regions."

### Lifecycle

Components register lifecycle callbacks via `onMount` and `onCleanup`:

```typescript
import { defineComponent, onMount, onCleanup, el } from '@jayobado/lolo-ui'

const Component = defineComponent(() => {
	onMount(() => {
		console.log('mounted')
		return () => console.log('about to unmount')
	})

	onCleanup(() => {
		console.log('disposing')
	})

	return el.div('hello')
})
```

- **`onMount(fn)`** — runs once, in a microtask after the DOM is attached.
  Use for measuring layout, focusing elements, or initializing third-party
  libraries that need a real DOM node. Returning a cleanup function from
  `fn` is shorthand for `onCleanup(returnedFn)`.

- **`onCleanup(fn)`** — runs when the component's scope disposes. Use for
  tearing down imperative resources you set up by hand (intervals, websockets,
  observers). For signals-based effects, you don't need it — the scope
  cleans those up.

Both must be called synchronously during the component's first run, before
the component function returns. They read the ambient scope; calling them
outside a component body is a no-op with a warning.

### When to use `defineComponent` vs a plain function

`defineComponent` exists so that components and elements share the same
shape at the call site (both produce VNodes). If a function returns a `Child`
and doesn't need to be called like an element, it doesn't need to be wrapped:

```typescript
// Plain function — fine for one-off helpers.
function userBadge(user: User): Child {
	return el.span({ class: 'badge' }, user.name)
}

// Used directly as a child:
div({},
	userBadge(currentUser),
)
```

Use `defineComponent` when:

- You want the call-site pattern `(props, ...children)`.
- You need `onMount` or `onCleanup` (these require the component's scope).
- The function will be passed somewhere expecting a component shape.

Use a plain function when:

- It's a simple transformation that takes data, returns DOM, and doesn't
  need lifecycle.
- You'd otherwise just be wrapping a plain `el.*` expression.

## Control flow

Two primitives: `when` for conditional rendering, `each` for keyed list
iteration.

### Conditional rendering — `when`

```typescript
import { when } from '@jayobado/lolo-ui'

when(
	predicate,             // signal, thunk, or plain value
	() => /* then branch */,
	() => /* else branch (optional) */,
)
```

When the predicate flips, the active branch's scope disposes (effects clean
up, DOM removes) and the new branch mounts fresh.

```typescript
when(
	isLoggedIn,
	() => UserMenu({}),
	() => el.button({ onClick: login }, 'Log in'),
)

when(
	() => count.get() > 0,
	() => el.p('Items: ', count),
	// no else branch — renders nothing when count is 0
)
```

Each branch runs in its own child scope. Effects in `then` don't leak into
`else` or vice versa.

### List rendering — `each`

```typescript
import { each } from '@jayobado/lolo-ui'

each(
	items,                      // signal of an array, or thunk
	(item, index) => /* render */,
	(item, index) => key,       // required: stable identifier per item
)
```

`each` performs keyed reconciliation:

- Items with the same key across updates are reused — DOM nodes stay, the
  row's scope retains its state.
- New items mount with fresh scopes.
- Removed items dispose.
- Reorders move existing DOM into position without rebuilding.

```typescript
each(
	() => users.get(),
	(user) => el.li({}, user.name),
	(user) => user.id,
)
```

A stable key function is required. For lists of objects with stable IDs, use
`item.id`. For append-only lists without reordering or middle deletion,
explicit positional keys are valid: `(_, i) => i`.

Why required: positional keys break in non-obvious ways when items reorder or
are removed from the middle — every subsequent row looks like a different
item to the reconciler, causing remounts that lose focus, scroll position,
and unsaved input state. Making the key explicit forces the decision at
the call site.

This matches the `ArrayNode.rowKey` requirement in the form DSL — same
contract, same rationale.

## SVG

SVG elements live on a separate `svg` namespace:

```typescript
import { el, svg } from '@jayobado/lolo-ui'

const Chart = defineComponent(() =>
	el.div({},
		el.h2('Chart'),
		svg.svg({ viewBox: '0 0 100 100', width: 200, height: 200 },
			svg.circle({
				cx: 50, cy: 50, r: 40,
				fill: 'tomato',
				stroke: 'black',
				'stroke-width': 2,
			}),
			svg.text({
				x: 50, y: 55,
				'text-anchor': 'middle',
				'font-family': 'sans-serif',
				fill: 'white',
			}, 'Hello'),
		),
	)
)
```

Why a separate namespace from `el`:

- SVG attributes are case-sensitive (`viewBox` not `viewbox`).
- Several tag names collide with HTML (`text`, `title`, `style`, `script`,
  `a`, `image`, `filter`). `svg.text` is the SVG text element; `el.span`
  is HTML.
- The renderer uses the namespace hint to call `createElementNS` with the
  SVG URI — required for SVG to actually render.

Hyphenated SVG attributes use string keys (no camelCase translation):
`'stroke-width'`, `'text-anchor'`, `'font-family'`, `'fill-rule'`.

### Mixing HTML inside SVG

`<foreignObject>` switches back to HTML for its children automatically:

```typescript
svg.svg({ viewBox: '0 0 200 100', width: 400 },
	svg.foreignObject({ x: 0, y: 0, width: 200, height: 100 },
		el.div({ class: 'overlay' },
			el.h3('HTML inside SVG'),
			el.p('Useful for text-heavy SVG annotations.'),
		),
	),
)
```

The renderer tracks the active namespace through the tree. SVG children of
SVG elements are SVG; HTML children of `foreignObject` are HTML. You don't
manage this.

## Custom elements

For web components or any HTML tag not in the `el` namespace:

```typescript
import { customElement } from '@jayobado/lolo-ui'
import type { Reactive } from '@jayobado/lolo-ui'

interface MyCardProps {
	variant?: Reactive<'default' | 'outlined' | 'elevated'>
}

const myCard = customElement<MyCardProps>('my-card')

myCard({ variant: 'elevated' }, 'content')
```

The tag must contain a hyphen (HTML5 custom element naming rule); the template
literal type catches violations at compile time.

For custom elements that expose JavaScript properties (the common case with
web components — Shoelace, Lit-based components, etc.), the renderer auto-
detects which prop keys are properties on the element class and uses property
assignment instead of `setAttribute`. So passing an array value to `value`
on a custom select works correctly:

```typescript
slSelect({
	value: ['a', 'b', 'c'],   // assigned as a property, not stringified
})
```

## Interop with `h()` and the DSLs

The renderer accepts DOM nodes as children. That means existing DSL output —
`renderForm()` returning `HTMLElement`, the table DSL, anything built with
`h()` — composes naturally with new components:

```typescript
import { defineComponent, el, mount } from '@jayobado/lolo-ui'
import { renderForm } from '@jayobado/lolo-ui/dsl'

const UserEditor = defineComponent<{ userId: string }>(() => {
	const form = renderForm(userForm, { onSubmit: handleSubmit })
	//          ^^^^^^^^^^^^ returns HTMLElement

	return el.div({ class: 'editor' },
		el.h2('Edit user'),
		form,   // HTMLElement child — rendered as-is
	)
})
```

The form's internal lifecycle (its own `scope.effect()` subscriptions) is
managed by the form DSL itself. If the form DSL attaches a `__loloDispose`
function to its returned element, the renderer calls it when the surrounding
component unmounts:

```typescript
// In a hypothetical DSL helper:
function buildWidget(): HTMLElement {
	const widgetScope = createScope()
	const el = h('div')
	// ... build DOM, register effects on widgetScope ...

	;(el as { __loloDispose?: () => void }).__loloDispose =
		() => widgetScope.dispose()

	return el
}
```

The convention is opt-in. Existing DSL output (which doesn't set this
property) continues to work — the element renders correctly, you just have
to manage its lifecycle externally if you need to. New code that produces
embeddable widgets can set the property to participate in scope-based
cleanup.

### When to use `el.*` vs `h()`

- **Use `el.*` and `defineComponent`** for views with reactive lists,
  conditional sections, or many small composed pieces. The variadic call
  style and typed props are friction-reducing.
- **Use `h()`** for low-level DOM construction, performance-critical inner
  loops, or places where you need an `HTMLElement` return value directly
  (e.g., the form DSL's internal renderers, or a hook's setup).

The form, table, and steps DSLs continue to return `HTMLElement` and remain
the recommended way to build forms and tables. Component authoring is for
the glue and custom views around them.

## Mounting

`mount(child, parent)` attaches a `Child` (VNode, primitive, signal, array,
or DOM node) to a parent element and returns a disposer:

```typescript
import { mount } from '@jayobado/lolo-ui'

const dispose = mount(MyComponent({ ... }), document.querySelector('#app')!)

// Later, to tear down:
dispose()
```

Mounting:

- Establishes a fresh root scope.
- Walks the tree once, creating DOM and binding signals.
- Returns a function that disposes the scope (removing DOM, tearing down
  effects, detaching event listeners).

In a container, `mount` is the bridge from VNode-based content to the
container's `HTMLElement` root:

```typescript
content: () => {
	const root = h('div', { class: 'page' })
	mount(MyComponent({ ... }), root)
	return root
}
```

The container's scope owns the mount's disposer — when the container unmounts
(via navigation), the mounted subtree disposes automatically. You don't need
to manually call the disposer in normal use.

## How it relates to signals and scope

The new surface uses the same primitives as everything else in lolo-ui:

- **Signals** drive reactivity. A signal passed as a prop or a child is
  bound to a DOM property or text node by the renderer; when the signal
  changes, only that property or text node updates. No re-render, no diff.

- **Scope** owns lifecycle. Each component runs inside a scope created by
  the renderer; the scope is a child of the parent mount's scope. When the
  parent disposes, the child disposes — cascading down through `when`
  branches, `each` rows, nested components.

- **Containers** still own the outermost scope. A `mount()` call inside a
  container's `content` function creates a scope that's owned by the
  container, so navigation cleans everything up.

In short: signals do reactivity, scope does cleanup, the renderer does the
DOM plumbing. The same as before — just expressed declaratively at the
authoring layer.

## Limitations

A few things the new surface deliberately doesn't do:

- **No re-rendering.** Components run once. To change what's rendered based
  on state, use signals (for leaf values), `when` (for whole subtrees),
  `each` (for lists). There's no component-level re-render trigger.

- **No diffing across updates.** The VNode tree exists only during the
  mount call. After mount, signals patch specific DOM nodes; there's no
  retained tree to diff.

- **No server-side rendering.** `mount` assumes a browser DOM. SSR would
  require a separate renderer that emits strings; not in scope for `0.4.0`.

- **No error boundaries.** Errors thrown during render propagate up the call
  stack. Errors thrown in effects are logged. A future version may add
  `errorBoundary(fallback, children)` if the need is clear.

- **No async components.** Components return synchronously. Async data should
  flow through `useQuery` (which exposes loading/error/data as signals)
  used inside the component, not via the component's return type.

These constraints keep the runtime small (~3-4KB min+gz for the renderer)
and the mental model simple (signals + scope + once-and-done mount). For
the apps lolo-ui targets — backend-dev-built dashboards and admin tools —
this is the right tradeoff.

## Where to go next

- **[Concepts](concepts.md)** — signals, scope, containers, `h()`.
- **[The declarative layer](declarative.md)** — forms, tables, multi-row
  sections, and multi-step flows.
- **[Subpath reference](subpaths.md)** — what each subpath exports, including
  the typed prop interfaces.
- **[Examples](examples.md)** — real shapes from real apps (signup, login,
  expense entry, search box).
- **[Patterns](patterns.md)** — app-level patterns built on the primitives
  (dialogs, dropdowns, route-aware links).