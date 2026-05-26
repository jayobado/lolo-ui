# Subpath reference

A quick scan of what each lolo-ui subpath exports. For depth, see the linked
docs.

## Root: `@jayobado/lolo-ui`

The core. Signals for reactivity, scope for lifecycle, container for
route-bound UI, `h()` for DOM, plus the router and app.

### Signals

```typescript
import { signal, effect, computed, batch } from '@jayobado/lolo-ui'
```

- **`signal<T>(initial)`** — create a reactive value. Returns `{ get, set, update }`.
- **`effect(fn)`** — run `fn` immediately and again when any signal it reads changes. Returns a `dispose` function.
- **`computed<T>(fn)`** — derived value that re-evaluates when its inputs change. Returns `{ get }`.
- **`batch(fn)`** — defer effects until `fn` returns; useful for updating multiple signals atomically.

See [Concepts → Signals](concepts.md#signals).

### Scope

```typescript
import { createScope, runInScope, getScope, resolveScope } from '@jayobado/lolo-ui'
import type { Scope } from '@jayobado/lolo-ui'
```

- **`createScope()`** — produce a new `Scope` with `effect`, `onCleanup`, and `dispose` methods.
- **`runInScope(scope, fn)`** — run `fn` with `scope` set as ambient. `getScope()` returns it inside.
- **`getScope()`** — read the current ambient scope (or `null` if none).
- **`resolveScope(explicit?)`** — return `explicit` if provided, otherwise the ambient scope.

See [Concepts → Scope](concepts.md#scope).

### Containers, router, and app

```typescript
import { defineContainer, createApp, h } from '@jayobado/lolo-ui'
import type { Container, RouteConfig } from '@jayobado/lolo-ui'
```

- **`defineContainer({ route, setup, content })`** — declare a route-bound view.
- **`createApp({ containers, routes? })`** — wire containers into a routed app. Returns `{ mount, unmount }`.
- **`h(tag, props?, ...children)`** — build a real DOM element.

See [Concepts → Containers](concepts.md#containers) and [Concepts → `h()`](concepts.md#h).

### Components and renderer (new in 0.4.0)

```typescript
import {
	mount, defineComponent, onMount, onCleanup,
	when, each, isControlFlowNode,
	el, svg, customElement,
	defineElement, isVNode,
} from '@jayobado/lolo-ui'

import type {
	Child, ComponentFn, ComponentVNode, ElementVNode, Reactive, VNode,
	ComponentFactory, ElementFn, ControlFlowNode,
} from '@jayobado/lolo-ui'
```

- **`mount(child, parent)`** — attach a `Child` (VNode, primitive, signal, or
  DOM node) to a parent element. Returns a disposer.
- **`defineComponent<P>(fn)`** — wrap a component function into a callable
  factory that produces VNodes.
- **`onMount(fn)`** — register a callback to run after the component's DOM is
  attached. Returning a cleanup function from `fn` registers it as a cleanup.
- **`onCleanup(fn)`** — register a cleanup callback on the ambient scope.
  Same function as `scope.onCleanup(fn)`; this convenience reads the ambient
  scope.
- **`when(predicate, then, else?)`** — conditional rendering. Mount the active
  branch; dispose the inactive one.
- **`each(items, render, keyFn)`** — keyed list rendering. Required stable
  key function.
- **`el`** — namespace object with typed factories for every HTML element.
  Destructure at file top: `const { div, h2, button } = el`.
- **`svg`** — namespace object with typed factories for SVG elements.
- **`customElement<P>(tag)`** — factory for hyphenated custom-element tags
  (web components, etc.).
- **`defineElement<P>(tag, namespace?)`** — lower-level factory for building
  your own typed element shortcuts. Used internally by `el` and `svg`.

See [Authoring components](components.md) for the full guide.

### Per-element prop interfaces

```typescript
import type {
	ElementProps, GlobalAttrs, GlobalEvents, EventHandler,
	AnchorProps, ButtonProps, InputProps, FormProps, LabelProps, ImgProps,
	TextareaProps, SelectProps, OptionProps, OptgroupProps, FieldsetProps,
	OutputProps, MeterProps, ProgressProps,
	VideoProps, AudioProps, SourceProps, TrackProps,
	IframeProps, CanvasProps, ObjectProps, EmbedProps,
	DetailsProps, DialogProps, TimeProps, DataProps,
	BlockquoteProps, QuoteProps, InsDelProps,
	TableCellProps, ThProps, ColProps, ColgroupProps,
	MapProps, AreaProps,
	LinkProps, MetaProps, BaseProps, ScriptProps, StyleProps,
} from '@jayobado/lolo-ui'

import type {
	SvgGlobalAttrs, SvgRootProps, GroupProps,
	CircleProps, EllipseProps, RectProps, LineProps,
	PolylineProps, PolygonProps, PathProps,
	SvgTextProps, TspanProps,
	SvgImageProps, ForeignObjectProps,
	LinearGradientProps, RadialGradientProps, StopProps, PatternProps,
	MarkerProps, ClipPathProps, MaskProps,
	FilterProps, FilterPrimitiveProps,
	DefsProps, UseProps, SymbolProps,
} from '@jayobado/lolo-ui'
```

Re-exported so you can type your own components with the same interfaces the
built-in factories use. For example, a custom button that adds an `icon` prop:

```typescript
interface IconButtonProps extends ButtonProps {
	icon: HTMLElement
}

const IconButton = defineComponent<IconButtonProps>((props) =>
	el.button({ ...props, class: ['icon-button', props.class].join(' ') },
		props.icon,
		props.children,
	)
)
```

### Reactive route state

```typescript
import { currentPath, currentRouteContext } from '@jayobado/lolo-ui'
import { navigateTo } from '@jayobado/lolo-ui'
```

- **`currentPath`** — `{ get: () => string }`. The current pathname, reactive.
  Read inside effects to update DOM when the route changes.
- **`currentRouteContext`** — `{ get: () => RouteContext | null }`. The full
  current route context (pathname, params, query). Null before the first render.
- **`navigateTo(path)`** — programmatic navigation. Throws if called before
  the app has initialized.

## `/dsl`

The declarative layer: forms, tables, multi-row sections, multi-step flows.

```typescript
import {
	renderForm, defineForm, createFormController,
	renderTable, defineTable,
	required, custom,
	validateWithRules, validateWithSchema,
} from '@jayobado/lolo-ui/dsl'

import type {
	FormNode, FormChild, FormController,
	InputNode, SelectNode, TextareaNode, CheckboxNode, RadioNode, ButtonNode,
	ArrayNode, ArrayColumnDef,
	StepsNode, StepDef, StepsContext,
	TableNode, ColumnDef, SortState, PaginationConfig, PaginationInfo,
	ValidationRule, ClassValue,
} from '@jayobado/lolo-ui/dsl'
```

### Forms

- **`renderForm<TState>(node)`** — render a form node into an `HTMLElement`.
- **`defineForm<TState>(node)`** — identity helper for declaration-site type inference.
- **`createFormController()`** — produce a `{ submit, reset }` object the form's render method wires up.

### Tables

- **`renderTable<TRow, TData>(node)`** — render a table node into an `HTMLElement`.
- **`defineTable<TRow, TData>(node)`** — identity helper for declaration-site type inference.

### Validation helpers

- **`required(message?)`** — built-in rule asserting non-empty.
- **`custom(test, message)`** — wrap an arbitrary predicate as a rule.
- **`validateWithRules(state, ruleSets)`** — run rule-based validation programmatically.
- **`validateWithSchema(state, schema)`** — run schema validation programmatically.

See [The declarative layer](declarative.md).

## `/query`

Reactive async data hooks. Wrap any Promise-returning function.

```typescript
import { useQuery, useMutation } from '@jayobado/lolo-ui/query'
import type { QueryOptions, QueryReturn, MutationOptions, MutationReturn } from '@jayobado/lolo-ui/query'
```

- **`useQuery<T>(fn, options?, scope?)`** — fire `fn()` on mount and again when signals it reads change. Returns `{ data, error, loading, refetch }`.
- **`useMutation<TArgs, TResult>(fn, options?, scope?)`** — wrap a function for manual invocation via `mutate(...args)`. Returns `{ mutate, data, error, loading, reset }`.

`useQuery` options: `enabled`, `retry`, `retryDelay`, `onError`.
`useMutation` options: `retry`, `retryDelay`, `onSuccess`, `onError`, `onSettled`. `mutate` throws on failure.

## `/hooks`

Imperative UI hooks for modals and dropdowns. Both manage their own DOM
lifecycle and clean up via the ambient scope.

```typescript
import { useModal, useDropdown } from '@jayobado/lolo-ui/hooks'
```

- **`useModal()`** — modal portal with backdrop, focus trap, escape key, scroll lock. Returns `{ open, close, isOpen, content }`.
- **`useDropdown(anchor, content)`** — content positioned below an anchor, dismissed on outside click or escape. Returns `{ open, close, toggle, isOpen }`.

## `/primitives`

Small low-level utilities. None of these are full features — they're the
building blocks used internally and worth knowing about for app code.

```typescript
import {
	clickOutside, escapeKey, eventListener, focusTrap, scrollLock,
	mediaQuery, localStorage, debounce, interval, portal,
	pagination, selection, clipboard,
	toast, configureToasts, enableTooltips,
} from '@jayobado/lolo-ui/primitives'
```

### DOM event utilities

- **`clickOutside(el, handler)`** — fire `handler` when a click lands outside `el`.
- **`escapeKey(handler)`** — fire `handler` when escape is pressed.
- **`eventListener(target, event, handler)`** — `addEventListener` with auto-cleanup via the ambient scope.

### Focus and scroll

- **`focusTrap(el)`** — trap keyboard focus inside `el` while active.
- **`scrollLock()`** — prevent body scroll. Useful for modal-like states.

### Reactive browser state

- **`mediaQuery(query)`** — returns a signal that tracks whether a media query matches.
- **`localStorage<T>(key, initial)`** — signal-backed by `localStorage`, synced across the same origin.

### Timing

- **`debounce(fn, ms)`** — debounced function call.
- **`interval(fn, ms)`** — start an interval that disposes with the ambient scope.

### Layout helpers

- **`portal(content, target?)`** — mount `content` into `target` (defaults to `document.body`). Returns a dispose function.
- **`pagination(opts)`** — compute pagination state from current page, page size, and total items.
- **`selection<T>(initial?)`** — manage a set of selected items with `add`, `remove`, `toggle`, `clear`, `isSelected`.

### Clipboard

- **`clipboard.write(text)`** / **`clipboard.read()`** — write/read clipboard text with error handling.

### Notifications

- **`toast.show(msg, opts?)`**, **`toast.info(msg)`**, **`toast.success(msg)`**, **`toast.warning(msg)`**, **`toast.error(msg)`**, **`toast.clear()`** — show transient toasts.
- **`configureToasts(opts)`** — set duration, position, max stack size. Call once at app startup.

### Tooltips

- **`enableTooltips(opts?)`** — start the tooltip singleton. After calling, any element with `data-tooltip="..."` shows a tooltip on hover/focus.

## See also

- **[Concepts](concepts.md)** — signals, scope, containers, `h()`.
- **[The declarative layer](declarative.md)** — full DSL deep dive.
- **[Examples](examples.md)** — real shapes (signup, login, expense entry, search box).
- **[Patterns](patterns.md)** — app-level patterns lolo-ui doesn't ship.