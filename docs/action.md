# Action Node

The action node defines buttons, links, and dropdown menus as plain data. Unlike form and table nodes, actions have no state and no engine — just types and a resolver function that evaluates toggles and binds callbacks.

Actions are designed to compose with other nodes. A save button triggers a form's submit. A delete button triggers a table's row action. A navigation link takes the user somewhere else. The action definition says *what*, the `onAction` callback says *how*.

```ts
import type { Action, ActionGroup } from '@jayobado/dsl-toolkit'

const saveButton: Action = {
  type: 'action',
  label: 'Save',
  action: 'submit',
  variant: 'primary',
  loading: (ctx) => !!ctx.saving,
}

const moreMenu: ActionGroup = {
  type: 'action-group',
  label: 'More',
  icon: '⋮',
  items: [
    { type: 'action', label: 'Export CSV', action: 'export-csv', icon: '📥' },
    { type: 'action', label: 'Import', action: 'import', icon: '📤' },
  ],
}
```

## Types

### Action

A single interactive element — a button or a link.

```ts
interface Action extends Node {
  type: 'action'
  label: string
  action?: string
  href?: string
  icon?: string
  variant?: string
  loading?: (context: Record<string, unknown>) => boolean
}
```

`action` and `href` are mutually exclusive. If `action` is set, it's a button that fires `onAction` when clicked. If `href` is set, it's a link that navigates.

`label` — display text. Also used as `aria-label` for icon-only buttons.

`icon` — optional icon string. The renderer decides how to display it — emoji, icon component, SVG, etc.

`variant` — optional style hint. The renderer maps it to CSS classes. Common values: `'primary'`, `'danger'`, `'ghost'`. The library doesn't enforce a set — any string works.

`loading` — callback that returns whether the action is in a loading state. Takes a context object. When loading, the renderer typically disables the button and shows a spinner.

`toggle` — inherited from `Node`. Controls visibility and interactivity based on context.

### ActionGroup

A collection of actions rendered together. Without a `label`, it renders as a button row. With a `label`, it renders as a dropdown menu.

```ts
interface ActionGroup extends Node {
  type: 'action-group'
  label?: string
  icon?: string
  items: Action[]
}
```

**Button row** — no label:
```ts
const toolbar: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: 'Edit', action: 'edit', icon: '✏️' },
    { type: 'action', label: 'Duplicate', action: 'duplicate', icon: '📋' },
    { type: 'action', label: 'Delete', action: 'delete', variant: 'danger', icon: '🗑️' },
  ],
}
```

**Dropdown menu** — has label:
```ts
const moreMenu: ActionGroup = {
  type: 'action-group',
  label: 'More Actions',
  icon: '⋮',
  items: [
    { type: 'action', label: 'Export CSV', action: 'export-csv', icon: '📥' },
    { type: 'action', label: 'Import', action: 'import', icon: '📤' },
    {
      type: 'action',
      label: 'Delete All',
      action: 'delete-all',
      variant: 'danger',
      toggle: (ctx) => ctx.role === 'admin' ? undefined : 'hide',
    },
  ],
}
```

The renderer decides the visual treatment — the definition just describes the structure.

`toggle` on the group controls the entire group's visibility. When the group is hidden or disabled, all its items are affected.

## Resolver

Actions don't have an engine — they have a resolver. The resolver evaluates toggles, binds the `onAction` callback, and returns ready-to-render objects.

### ResolvedAction

```ts
interface ResolvedAction {
  label: string
  icon?: string
  variant?: string
  href?: string
  readonly hidden: boolean
  readonly disabled: boolean
  readonly loading: boolean
  execute: () => void
}
```

All readable state properties are getters — they re-evaluate `toggle` and `loading` against the current context on every access. This keeps them reactive for signal-based frameworks.

`execute` — call when the user clicks. For buttons, it calls `onAction` with the action string. For links, the renderer handles navigation directly via `href`.

### ResolvedActionGroup

```ts
interface ResolvedActionGroup {
  label?: string
  icon?: string
  readonly hidden: boolean
  readonly disabled: boolean
  items: ResolvedAction[]
}
```

No `execute` — the group itself isn't clickable. Its items are.

### ResolveOptions

```ts
interface ResolveOptions {
  context?: Record<string, unknown>
  onAction?: (action: string) => void
}
```

`context` — arbitrary data for `toggle` and `loading` evaluation. Form state, user role, loading flags — whatever the actions need to read.

`onAction` — called when a button action fires. Receives the action string from the `Action` definition.

### resolveAction

```ts
function resolveAction(action: Action, options?: ResolveOptions): ResolvedAction
```

Resolves a single action. Binds toggle, loading, and the execute callback.

### resolveActionGroup

```ts
function resolveActionGroup(group: ActionGroup, options?: ResolveOptions): ResolvedActionGroup
```

Resolves a group and all its items. The group's own toggle is resolved, and each item is resolved with the same options.

## Framework Integration

### Vue 3

#### Render Helpers

```ts
// vue-actions.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { ResolvedAction, ResolvedActionGroup } from '@jayobado/dsl-toolkit'

export function renderAction(action: ResolvedAction): VNode | null {
  if (action.hidden) return null

  if (action.href) {
    return h('a', {
      href: action.href,
      class: `btn btn--${action.variant ?? 'default'}`,
    }, [
      action.icon ? h('span', { class: 'btn-icon' }, action.icon) : null,
      action.label,
    ])
  }

  return h('button', {
    type: 'button',
    disabled: action.disabled || action.loading,
    class: `btn btn--${action.variant ?? 'default'}`,
    onClick: action.execute,
  }, [
    action.loading ? h('span', { class: 'spinner' }) : null,
    action.icon && !action.loading ? h('span', { class: 'btn-icon' }, action.icon) : null,
    action.label,
  ])
}

export function renderActionGroup(group: ResolvedActionGroup): VNode | null {
  if (group.hidden) return null

  // No label — button row
  if (!group.label) {
    return h('div', { class: 'action-group' },
      group.items.map(renderAction)
    )
  }

  // With label — dropdown menu
  return h('div', { class: 'dropdown' }, [
    h('button', {
      type: 'button',
      class: 'dropdown-trigger',
      disabled: group.disabled,
    }, [
      group.icon ? h('span', { class: 'btn-icon' }, group.icon) : null,
      group.label,
    ]),
    h('div', { class: 'dropdown-menu' },
      group.items.map(renderAction)
    ),
  ])
}
```

#### Usage with Form

```ts
import { defineComponent, ref, h } from 'vue'
import { form } from './vue-form'
import { renderAction } from './vue-actions'
import { resolveAction } from '@jayobado/dsl-toolkit'
import type { Action } from '@jayobado/dsl-toolkit'

const saveAction: Action = {
  type: 'action',
  label: 'Save',
  action: 'submit',
  variant: 'primary',
  loading: (ctx) => !!ctx.saving,
}

const cancelAction: Action = {
  type: 'action',
  label: 'Cancel',
  action: 'cancel',
}

export default defineComponent({
  setup() {
    const saving = ref(false)
    const f = form(userFormDef)

    const onAction = (action: string) => {
      if (action === 'submit') {
        saving.value = true
        f.submit()
        saving.value = false
      }
      if (action === 'cancel') router.back()
    }

    return () => {
      const ctx = { saving: saving.value }

      return h('div', {}, [
        f.render(),
        h('div', { class: 'form-actions' }, [
          renderAction(resolveAction(saveAction, { context: ctx, onAction })),
          renderAction(resolveAction(cancelAction, { onAction })),
        ]),
      ])
    }
  },
})
```

#### Usage with Table

```ts
import { defineComponent, h } from 'vue'
import { table } from './vue-table'
import { renderActionGroup } from './vue-actions'
import { resolveActionGroup } from '@jayobado/dsl-toolkit'
import type { ActionGroup } from '@jayobado/dsl-toolkit'

const bulkMenu: ActionGroup = {
  type: 'action-group',
  label: 'Bulk Actions',
  items: [
    { type: 'action', label: 'Export CSV', action: 'export-csv', icon: '📥' },
    { type: 'action', label: 'Send Invites', action: 'send-invites', icon: '✉️' },
    {
      type: 'action',
      label: 'Delete Selected',
      action: 'delete-selected',
      variant: 'danger',
      toggle: (ctx) => (ctx.selectedCount as number) > 0 ? undefined : 'disable',
    },
  ],
}

export default defineComponent({
  setup() {
    const selectedRows = ref<Record<string, unknown>[]>([])
    const t = table(userTableDef, users)

    return () => {
      const ctx = { selectedCount: selectedRows.value.length }

      return h('div', {}, [
        t.render(),
        renderActionGroup(resolveActionGroup(bulkMenu, {
          context: ctx,
          onAction: (action) => {
            if (action === 'export-csv') exportCsv()
            if (action === 'send-invites') sendInvites()
            if (action === 'delete-selected') deleteSelected(selectedRows.value)
          },
        })),
      ])
    }
  },
})
```

#### Standalone Navigation

```ts
import { defineComponent, h } from 'vue'
import { renderAction, renderActionGroup } from './vue-actions'
import { resolveAction, resolveActionGroup } from '@jayobado/dsl-toolkit'
import type { Action, ActionGroup } from '@jayobado/dsl-toolkit'

const navLinks: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: 'Home', href: '/' },
    { type: 'action', label: 'Dashboard', href: '/dashboard' },
    { type: 'action', label: 'Settings', href: '/settings', icon: '⚙️' },
    { type: 'action', label: 'Docs', href: 'https://docs.example.com', icon: '📖' },
  ],
}

export default defineComponent({
  setup() {
    return () => h('nav', {},
      renderActionGroup(resolveActionGroup(navLinks))
    )
  },
})
```

### lolo-ui (Signals)

#### Render Helpers

```ts
// lolo-actions.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import type { ResolvedAction, ResolvedActionGroup } from '@jayobado/dsl-toolkit'

export function renderAction(action: ResolvedAction): HTMLElement {
  if (action.href) {
    const a = el('a', {
      href: action.href,
      class: `btn btn--${action.variant ?? 'default'}`,
    })
    show(a, () => !action.hidden)
    if (action.icon) a.append(el('span', { class: 'btn-icon' }, text(action.icon)))
    a.append(text(action.label))
    return a
  }

  const btn = el('button', { type: 'button', class: `btn btn--${action.variant ?? 'default'}` })
  show(btn, () => !action.hidden)
  attr(btn, 'disabled', () => action.disabled || action.loading)
  on(btn, 'click', action.execute)

  if (action.icon) btn.append(el('span', { class: 'btn-icon' }, text(action.icon)))
  btn.append(text(action.label))

  return btn
}

export function renderActionGroup(group: ResolvedActionGroup): HTMLElement {
  if (!group.label) {
    const wrapper = el('div', { class: 'action-group' })
    show(wrapper, () => !group.hidden)
    for (const item of group.items) {
      wrapper.append(renderAction(item))
    }
    return wrapper
  }

  const dropdown = el('div', { class: 'dropdown' })
  show(dropdown, () => !group.hidden)

  const trigger = el('button', { type: 'button', class: 'dropdown-trigger' })
  attr(trigger, 'disabled', () => group.disabled)
  if (group.icon) trigger.append(el('span', { class: 'btn-icon' }, text(group.icon)))
  trigger.append(text(group.label))
  dropdown.append(trigger)

  const menu = el('div', { class: 'dropdown-menu' })
  for (const item of group.items) {
    menu.append(renderAction(item))
  }
  dropdown.append(menu)

  return dropdown
}
```

#### Usage

```ts
import { mount, el, on, reactiveObject } from '@jayobado/lolo-ui'
import { resolveAction, resolveActionGroup } from '@jayobado/dsl-toolkit'
import { renderAction, renderActionGroup } from './lolo-actions'
import { engine as formEngine } from './lolo-form'
import type { Action, ActionGroup, FormHandle } from '@jayobado/dsl-toolkit'

const saveAction: Action = {
  type: 'action',
  label: 'Save',
  action: 'submit',
  variant: 'primary',
  loading: (ctx) => !!ctx.saving,
}

const cancelAction: Action = {
  type: 'action',
  label: 'Cancel',
  action: 'cancel',
}

// State
const ctx = reactiveObject({ saving: false })
let formHandle: FormHandle | undefined

// Render form
const formEl = formEngine.render(userFormDef, {
  reactive: reactiveObject,
  onReady: (h) => { formHandle = h },
})

// Resolve and render actions
const save = renderAction(resolveAction(saveAction, {
  context: ctx,
  onAction: (action) => {
    if (action === 'submit') {
      ctx.saving = true
      formHandle?.submit()
      ctx.saving = false
    }
  },
}))

const cancel = renderAction(resolveAction(cancelAction, {
  onAction: (action) => {
    if (action === 'cancel') window.history.back()
  },
}))

// Mount
const page = el('div')
page.append(formEl)

const actions = el('div', { class: 'form-actions' })
actions.append(save)
actions.append(cancel)
page.append(actions)

mount('#app', page)
```

## Examples

### Form Save/Cancel

```ts
import type { Action } from '@jayobado/dsl-toolkit'

const saveAction: Action = {
  type: 'action',
  label: 'Save',
  action: 'submit',
  variant: 'primary',
  loading: (ctx) => !!ctx.saving,
}

const cancelAction: Action = {
  type: 'action',
  label: 'Cancel',
  action: 'cancel',
}
```

### Toolbar

```ts
import type { ActionGroup } from '@jayobado/dsl-toolkit'

const toolbar: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: 'Add User', action: 'add-user', icon: '+', variant: 'primary' },
    { type: 'action', label: 'Export', action: 'export', icon: '📥' },
    { type: 'action', label: 'Import', action: 'import', icon: '📤' },
    { type: 'action', label: 'Settings', action: 'settings', icon: '⚙️' },
  ],
}
```

### Dropdown Menu with Conditional Items

```ts
import type { ActionGroup } from '@jayobado/dsl-toolkit'

const adminMenu: ActionGroup = {
  type: 'action-group',
  label: 'Admin',
  icon: '⋮',
  items: [
    { type: 'action', label: 'View Logs', action: 'view-logs' },
    { type: 'action', label: 'System Settings', action: 'system-settings' },
    {
      type: 'action',
      label: 'Danger Zone',
      action: 'danger-zone',
      variant: 'danger',
      toggle: (ctx) => ctx.role === 'superadmin' ? undefined : 'hide',
    },
    {
      type: 'action',
      label: 'Maintenance Mode',
      action: 'maintenance',
      toggle: (ctx) => ctx.maintenanceAvailable ? undefined : 'disable',
    },
  ],
}
```

### Navigation Links

```ts
import type { Action, ActionGroup } from '@jayobado/dsl-toolkit'

const mainNav: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: 'Home', href: '/' },
    { type: 'action', label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { type: 'action', label: 'Users', href: '/users', icon: '👤' },
    { type: 'action', label: 'Settings', href: '/settings', icon: '⚙️' },
  ],
}

const footerLinks: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: 'Documentation', href: 'https://docs.example.com' },
    { type: 'action', label: 'GitHub', href: 'https://github.com/example' },
    { type: 'action', label: 'Status', href: 'https://status.example.com' },
  ],
}
```

### Mixed Actions and Links

```ts
import type { ActionGroup } from '@jayobado/dsl-toolkit'

const pageHeader: ActionGroup = {
  type: 'action-group',
  items: [
    { type: 'action', label: '← Back', action: 'back' },
    { type: 'action', label: 'Help', href: '/help', icon: '❓' },
    { type: 'action', label: 'Refresh', action: 'refresh', icon: '🔄' },
  ],
}
```

### Composing with Form and Table

A full page that uses all three node types together.

```ts
import { defineComponent, ref, h } from 'vue'
import { form } from './vue-form'
import { table } from './vue-table'
import { renderAction, renderActionGroup } from './vue-actions'
import { resolveAction, resolveActionGroup } from '@jayobado/dsl-toolkit'
import type { Form, Table, Action, ActionGroup } from '@jayobado/dsl-toolkit'

// Form definition
const userForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/users', { method: 'POST', body: JSON.stringify(state) })
  },
  items: [
    { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
    { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
  ],
}

// Table definition
const userTable: Table = {
  type: 'table',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      cell: (v) => ({ type: 'badge', label: v as string, variant: 'neutral' }),
    },
  ],
  actions: [
    { label: 'Edit', action: 'edit' },
    { label: 'Delete', action: 'delete', variant: 'danger' },
  ],
}

// Action definitions
const formActions: ActionGroup = {
  type: 'action-group',
  items: [
    {
      type: 'action',
      label: 'Create User',
      action: 'submit',
      variant: 'primary',
      loading: (ctx) => !!ctx.saving,
    },
    { type: 'action', label: 'Cancel', action: 'cancel' },
  ],
}

const bulkMenu: ActionGroup = {
  type: 'action-group',
  label: 'Bulk Actions',
  items: [
    { type: 'action', label: 'Export CSV', action: 'export' },
    { type: 'action', label: 'Delete Selected', action: 'delete-selected', variant: 'danger' },
  ],
}

// Mount everything
export default defineComponent({
  setup() {
    const saving = ref(false)
    const users = ref([
      { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob', email: 'bob@example.com', role: 'editor' },
    ])

    const f = form(userForm)
    const t = table(userTable, users.value, {
      onAction: (action, row) => {
        if (action === 'edit') console.log('edit', row)
        if (action === 'delete') console.log('delete', row)
      },
    })

    return () => {
      const ctx = { saving: saving.value }

      return h('div', { class: 'page' }, [
        h('h1', {}, 'User Management'),

        // Form
        f.render(),

        // Form actions
        renderActionGroup(resolveActionGroup(formActions, {
          context: ctx,
          onAction: (action) => {
            if (action === 'submit') {
              saving.value = true
              f.submit()
              saving.value = false
            }
            if (action === 'cancel') router.back()
          },
        })),

        // Table
        t.render(),

        // Bulk actions
        renderActionGroup(resolveActionGroup(bulkMenu, {
          onAction: (action) => {
            if (action === 'export') exportCsv(users.value)
            if (action === 'delete-selected') deleteSelected()
          },
        })),
      ])
    }
  },
})
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Action` | Single action — `label`, `action?`, `href?`, `icon?`, `variant?`, `loading?`, `toggle?` |
| `ActionGroup` | Group of actions — `label?`, `icon?`, `items`, `toggle?` |

### Resolver

| Export | Description |
|--------|-------------|
| `resolveAction(action, options?)` | Resolves one action — returns `ResolvedAction` |
| `resolveActionGroup(group, options?)` | Resolves a group and its items — returns `ResolvedActionGroup` |
| `ResolvedAction` | Ready to render — `label`, `icon?`, `variant?`, `href?`, `hidden`, `disabled`, `loading`, `execute` |
| `ResolvedActionGroup` | Ready to render — `label?`, `icon?`, `hidden`, `disabled`, `items` |
| `ResolveOptions` | Options — `context?`, `onAction?` |