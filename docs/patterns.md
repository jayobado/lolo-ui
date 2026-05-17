# Patterns

App-level patterns lolo-ui doesn't ship — built on top of the primitives. The
toolkit deliberately keeps its surface small, leaving styling, layout, and
domain-specific shapes to the app. This doc shows a handful of patterns that
come up often enough to be worth documenting as recipes.

Each pattern is yours to copy into your app and adapt. The code here is a
starting point, not a library. Adjust the shape, classes, and behavior to
your design system.

## Dialog layouts

`useModal` from `/hooks` handles the mounting — backdrop, focus trap, escape
key, scroll lock. It doesn't impose a layout on the modal content. That's
your job, and it's worth writing once as a helper.

A common shape is title-body-actions:

```typescript
import { h } from '@jayobado/lolo-ui'

interface DialogAction {
	label:    string
	onClick:  () => void
	primary?: boolean
	disabled?: boolean
}

interface DialogOpts {
	title:    string
	body:     HTMLElement | string
	actions?: readonly DialogAction[]
}

export function dialog(opts: DialogOpts): HTMLElement {
	const wrapper = h('div', { class: 'dialog' })

	wrapper.append(h('header', { class: 'dialog-header' }, [
		h('h2', { class: 'dialog-title' }, opts.title),
	]))

	const body = h('div', { class: 'dialog-body' },
		typeof opts.body === 'string' ? opts.body : null,
	)
	if (typeof opts.body !== 'string') body.append(opts.body)
	wrapper.append(body)

	if (opts.actions && opts.actions.length > 0) {
		const actionsEl = h('footer', { class: 'dialog-actions' })
		for (const action of opts.actions) {
			const btn = h('button', {
				type:     'button',
				class:    action.primary ? 'btn btn-primary' : 'btn',
				onClick:  action.onClick,
				disabled: action.disabled ?? false,
			}, action.label)
			actionsEl.append(btn)
		}
		wrapper.append(actionsEl)
	}

	return wrapper
}
```

Usage:

```typescript
import { useModal } from '@jayobado/lolo-ui/hooks'

const modal = useModal()

modal.open(dialog({
	title: 'Delete user',
	body:  'This action cannot be undone.',
	actions: [
		{ label: 'Cancel', onClick: () => modal.close() },
		{ label: 'Delete', onClick: () => { deleteUser(); modal.close() }, primary: true },
	],
}))
```

The helper lives in your app code (`src/lib/dialog.ts` or similar). Style the
`.dialog`, `.dialog-header`, `.dialog-body`, `.dialog-actions` classes to
match your design system.

### Why it lives in app code

This helper isn't in lolo-ui because the layout decisions are app-specific.
Some apps want the title in a colored bar; some want actions on the left; some
want a close-X in the corner. lolo-ui can't ship one layout that fits all
apps. The helper is small enough (~30 lines) that copying it per app is the
right tradeoff.

## Confirm helper

A common dialog pattern is "are you sure?" — wait for a yes/no answer, then
proceed. Wrap the dialog helper in a promise:

```typescript
import { useModal } from '@jayobado/lolo-ui/hooks'

interface ConfirmOpts {
	title:         string
	body:          string
	confirmLabel?: string
	cancelLabel?:  string
	destructive?:  boolean
}

export function confirm(opts: ConfirmOpts): Promise<boolean> {
	const modal = useModal()

	return new Promise((resolve) => {
		modal.open(dialog({
			title: opts.title,
			body:  opts.body,
			actions: [
				{
					label:   opts.cancelLabel ?? 'Cancel',
					onClick: () => { modal.close(); resolve(false) },
				},
				{
					label:   opts.confirmLabel ?? 'Confirm',
					onClick: () => { modal.close(); resolve(true) },
					primary: !opts.destructive,
				},
			],
		}))
	})
}
```

This assumes the `dialog()` helper from the previous section is in the same
module or imported.

Usage in container code:

```typescript
content: ({ deleteUser }) => {
	const root = h('div')

	const deleteBtn = h('button', {
		class:   'btn btn-danger',
		onClick: async () => {
			const ok = await confirm({
				title:        'Delete user',
				body:         'This cannot be undone.',
				confirmLabel: 'Delete',
				destructive:  true,
			})
			if (ok) {
				await deleteUser()
			}
		},
	}, 'Delete')

	root.append(deleteBtn)
	return root
}
```

The `destructive` option flips the primary styling — when destructive, the
"confirm" button is *not* primary, so a careless reader won't accidentally
hit it. A small detail, worth getting right.

### Other promise-returning dialogs

The same pattern extends to:

- **`prompt({ title, body, placeholder })`** — show an input, resolve with
  the entered value or `null` on cancel.
- **`alert({ title, body })`** — single-action notification, resolve when
  acknowledged.

Build them as you need them. The pattern is always: open a modal with the
shape you want, resolve the promise based on which action fired.

## Dropdown menus

`useDropdown` handles positioning, click-outside dismissal, and escape key.
It doesn't ship a list-of-items API. Build one in your app:

```typescript
import { h } from '@jayobado/lolo-ui'
import { useDropdown } from '@jayobado/lolo-ui/hooks'

interface MenuItem {
	label:    string
	onClick:  () => void
	disabled?: boolean
	icon?:     HTMLElement
}

export function menu(anchor: HTMLElement, items: readonly MenuItem[]): void {
	const list = h('ul', { class: 'menu' })

	for (const item of items) {
		const li = h('li', { class: 'menu-item' })

		const button = h('button', {
			type:     'button',
			class:    'menu-item-button',
			disabled: item.disabled ?? false,
			onClick: () => {
				item.onClick()
				dropdown.close()
			},
		})

		if (item.icon) {
			button.append(item.icon)
		}
		button.append(h('span', { class: 'menu-item-label' }, item.label))

		li.append(button)
		list.append(li)
	}

	const dropdown = useDropdown(anchor, list)

	anchor.addEventListener('click', (e) => {
		e.stopPropagation()
		dropdown.toggle()
	})
}
```

Usage:

```typescript
const actionsButton = h('button', { class: 'btn' }, 'Actions')

menu(actionsButton, [
	{
		label:   'Edit',
		onClick: () => editUser(user),
	},
	{
		label:   'Duplicate',
		onClick: () => duplicateUser(user),
	},
	{
		label:    'Delete',
		onClick:  () => deleteUser(user),
		disabled: !canDelete(user),
	},
])

root.append(actionsButton)
```

The helper:

- Builds a `<ul>` of buttons, one per item.
- Wires each button's click to the item's handler *and* closes the dropdown.
- Wires the anchor's click to toggle the dropdown.
- Stops propagation on the anchor click so the dropdown's own
  click-outside logic doesn't immediately re-close it.

### Variations

For divider items, item groups, or nested submenus, extend the `MenuItem`
type. A divider could be:

```typescript
type MenuItem =
	| { kind: 'item';     label: string; onClick: () => void; disabled?: boolean }
	| { kind: 'divider' }
```

And the loop renders dividers as `<hr>` between items. The base helper stays
small; variations live in the same file or extend in domain-specific helpers.

## Route-aware links

The router exposes `currentPath` as a reactive signal — read it inside an
effect to update DOM when the route changes. A small helper that produces
auto-highlighting links:

```typescript
import { h, currentPath, getScope } from '@jayobado/lolo-ui'

interface ActiveLinkOpts {
	href:         string
	label:        string
	activeClass?: string
	icon?:        HTMLElement
}

export function activeLink(opts: ActiveLinkOpts): HTMLElement {
	const a = h('a', {
		href:  opts.href,
		class: 'nav-link',
	})

	if (opts.icon) a.append(opts.icon)
	a.append(h('span', { class: 'nav-link-label' }, opts.label))

	const scope = getScope()!
	scope.effect(() => {
		const path = currentPath.get()
		const matches = path === opts.href || path.startsWith(opts.href + '/')
		a.classList.toggle(opts.activeClass ?? 'nav-link--active', matches)
	})

	return a
}
```

Usage in a sidebar:

```typescript
const sidebar = h('nav', { class: 'sidebar' }, [
	activeLink({ href: '/dashboard', label: 'Dashboard' }),
	activeLink({ href: '/users',     label: 'Users' }),
	activeLink({ href: '/reports',   label: 'Reports' }),
	activeLink({ href: '/settings',  label: 'Settings' }),
])
```

A few real points:

- **Prefix matching for nested routes.** Checking `path.startsWith(opts.href
  + '/')` means `/users/123` highlights the `/users` link. Adjust to exact-
  only (`path === opts.href`) if you want different behavior.
- **The effect lives in the ambient scope.** When the container hosting
  this nav unmounts, the effect cleans up.
- **For route params or query, use `currentRouteContext` instead.** It's the
  same shape but exposes the full RouteContext: pathname, params, query.

### Building a full nav

A real sidebar with sections is composition:

```typescript
export function sidebar(): HTMLElement {
	return h('nav', { class: 'sidebar' }, [
		h('section', { class: 'sidebar-section' }, [
			h('h3', { class: 'sidebar-heading' }, 'Operations'),
			activeLink({ href: '/dashboard', label: 'Dashboard' }),
			activeLink({ href: '/orders',    label: 'Orders' }),
			activeLink({ href: '/customers', label: 'Customers' }),
		]),
		h('section', { class: 'sidebar-section' }, [
			h('h3', { class: 'sidebar-heading' }, 'Analytics'),
			activeLink({ href: '/reports',  label: 'Reports' }),
			activeLink({ href: '/insights', label: 'Insights' }),
		]),
	])
}
```

This composes inside a layout container or directly in `createApp`'s shell.
Style the `.sidebar`, `.sidebar-section`, `.sidebar-heading`, `.nav-link`,
and `.nav-link--active` classes to match your design.

For collapsible sections, mobile breakpoints, or keyboard navigation, build
those on top. They're not universal; they're product decisions.

## Why these aren't in lolo-ui

Each of these patterns has the same shape: a small amount of universal
behavior (modal lifecycle, dropdown positioning, route matching) plus a lot
of app-specific structure (dialog layout, menu items, sidebar shape).

lolo-ui owns the universal parts — `useModal`, `useDropdown`, the router.
The structural parts vary too much across apps for one primitive to fit
all of them. Trying to ship a "complete" version would either be too rigid
(every app gets the same dialog layout) or too configurable (a sea of
options for every variation).

The line: lolo-ui ships behavior and accessibility. Apps own structural
and visual decisions. The helpers in this doc are your starting point for
the structural part — copy them, modify them, make them yours.

## Where to go next

If you've read every doc in order, you've covered:

- **[Concepts](concepts.md)** — the foundation.
- **[The declarative layer](declarative.md)** — forms, tables, arrays, steps.
- **[Subpath reference](subpaths.md)** — what each subpath exports.
- **[Examples](examples.md)** — real shapes.
- **[Patterns](patterns.md)** — this doc.

The source is the next layer of detail. The codebase is small enough to read
in a sitting — modules in `/core`, `/dsl`, `/query`, `/hooks`, `/primitives`
are each focused enough to skim individually.