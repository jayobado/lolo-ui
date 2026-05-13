# Block

A structured container with an optional header (title, subtitle, icon, actions), content, and built-in states (collapsed, loading, closed). A block scales from a simple card (just a title and content) to a full dashboard widget (header actions, collapse, close, loading indicator).

```ts
import type { Block } from '@jayobado/dsl-toolkit'

// Simple card
const profileCard: Block = {
  type: 'block',
  header: { title: { content: 'User Profile' } },
  content: profileForm,
}

// Full dashboard widget
const activityWidget: Block = {
  type: 'block',
  collapsible: true,
  header: {
    title: { content: 'Activity Log', subtitle: 'Last 30 days' },
    icon: '📊',
    actions: [
      { type: 'action', label: 'Refresh', action: 'refresh', icon: '🔄' },
      { type: 'action', label: 'Export', action: 'export', icon: '📥' },
    ],
  },
  content: activityTable,
}
```

## Types

### Block

```ts
interface Block extends Node {
  type: 'block'
  id?: string
  header?: BlockHeader
  content: PanelContent | PanelContent[]
  collapsible?: boolean
  closable?: boolean
  defaultCollapsed?: boolean
}
```

`id` — optional DOM identifier.

`header` — optional header with title, icon, and actions. When absent, the block renders as a plain content wrapper.

`content` — uses `PanelContent` — strings, forms, tables, alerts, display types, and other blocks. See [Display & Content](./display.md).

`collapsible` — whether the block can be collapsed/expanded. Defaults to `false`.

`closable` — whether the block can be closed (hidden). Defaults to `false`.

`defaultCollapsed` — whether the block starts collapsed. Defaults to `false`.

### BlockHeader

```ts
interface BlockHeader {
  title?: BlockTitle
  icon?: string
  actions?: Action[]
}
```

`title` — the header text with optional subtitle.

`icon` — rendered before the title. The renderer decides how — emoji, icon component, CSS class.

`actions` — action definitions rendered in the header's options area. Uses the [Action type](./action.md). The resolver evaluates toggles and binds callbacks.

### BlockTitle

```ts
interface BlockTitle {
  content: string | (() => string)
  subtitle?: string | (() => string)
}
```

Both `content` and `subtitle` support callbacks for dynamic text via closures.

```ts
// Static
{ content: 'User Profile', subtitle: 'Edit your details' }

// Dynamic
{ content: () => `${projectName.value} Dashboard`, subtitle: () => `${taskCount.value} tasks` }
```

## Resolver

### resolveBlock

```ts
function resolveBlock(block: Block, onAction?: (action: string) => void): BlockHandle
```

Creates a handle that manages the block's runtime state — collapsed, loading, closed — and resolves header actions.

### BlockHandle

```ts
interface BlockHandle {
  id?: string
  icon?: string
  readonly title?: string
  readonly subtitle?: string
  content: PanelContent[]
  headerActions: ResolvedAction[]
  readonly hidden: boolean
  readonly collapsed: boolean
  readonly loading: boolean
  toggleCollapse: () => void
  close: () => void
  setLoading: (value: boolean) => void
}
```

`title` / `subtitle` — getters. Dynamic values re-evaluate on every read.

`headerActions` — resolved custom actions from the header definition. The renderer draws these alongside the built-in collapse/close buttons.

`hidden` — `true` when the block is closed or when its `toggle` returns `'hide'`.

`collapsed` — `true` when the block is collapsed. The renderer hides the content area.

`loading` — `true` when `setLoading(true)` has been called. The renderer shows a loading indicator.

`toggleCollapse` — flip collapsed state. The renderer binds this to a collapse button.

`close` — hide the block and emit `'close'` via `onAction`. The renderer binds this to a close button.

`setLoading` — programmatic loading control. Call before async operations and clear when done.

## Framework Integration

### Vue 3

#### Renderer

```ts
// vue-block.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { BlockHandle } from '@jayobado/dsl-toolkit'
import { renderPanelContent } from './vue-content'
import { renderAction } from './vue-actions'

export function renderBlock(handle: BlockHandle): VNode | null {
  if (handle.hidden) return null

  return h('div', {
    class: ['block', {
      'block--collapsed': handle.collapsed,
      'block--loading': handle.loading,
    }],
    id: handle.id,
  }, [
    // Header
    (handle.title || handle.icon || handle.headerActions.length > 0)
      ? h('div', { class: 'block-header' }, [
          handle.icon
            ? h('span', { class: 'block-icon' }, handle.icon)
            : null,
          handle.title
            ? h('h3', { class: 'block-title' }, [
                handle.title,
                handle.subtitle
                  ? h('small', { class: 'block-subtitle' }, handle.subtitle)
                  : null,
              ])
            : null,
          h('div', { class: 'block-options' }, [
            ...handle.headerActions.map(renderAction),
            handle.collapsed !== undefined
              ? h('button', {
                  class: 'btn-block-option',
                  onClick: handle.toggleCollapse,
                }, handle.collapsed ? '▶' : '▼')
              : null,
          ]),
        ])
      : null,

    // Content — hidden when collapsed
    !handle.collapsed
      ? h('div', { class: 'block-content' }, renderPanelContent(handle.content))
      : null,

    // Loading overlay
    handle.loading
      ? h('div', { class: 'block-loader' })
      : null,
  ])
}
```

#### Usage

```ts
import { defineComponent, h } from 'vue'
import { resolveBlock } from '@jayobado/dsl-toolkit'
import { renderBlock } from './vue-block'
import type { Block } from '@jayobado/dsl-toolkit'

const statsBlock: Block = {
  type: 'block',
  collapsible: true,
  header: {
    title: { content: 'Revenue', subtitle: 'This month' },
    icon: '💰',
    actions: [
      { type: 'action', label: 'Refresh', action: 'refresh', icon: '🔄' },
    ],
  },
  content: [
    { type: 'text', content: () => `KES ${revenue.value.toLocaleString()}`, variant: 'heading' },
    { type: 'badge', label: '↑ 12% vs last month', variant: 'success' },
  ],
}

export default defineComponent({
  setup() {
    const handle = resolveBlock(statsBlock, (action) => {
      if (action === 'refresh') {
        handle.setLoading(true)
        fetchRevenue().then(() => handle.setLoading(false))
      }
    })

    return () => renderBlock(handle)
  },
})
```

### lolo-ui

#### Renderer

```ts
// lolo-block.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import type { BlockHandle } from '@jayobado/dsl-toolkit'
import { renderPanelContent } from './lolo-content'
import { renderAction } from './lolo-actions'

export function renderBlock(handle: BlockHandle): HTMLElement {
  const wrapper = el('div', { class: 'block' })
  show(wrapper, () => !handle.hidden)
  attr(wrapper, 'class', () =>
    `block ${handle.collapsed ? 'block--collapsed' : ''} ${handle.loading ? 'block--loading' : ''}`
  )
  if (handle.id) wrapper.id = handle.id

  // Header
  if (handle.title || handle.icon || handle.headerActions.length > 0) {
    const header = el('div', { class: 'block-header' })

    if (handle.icon) {
      const icon = el('span', { class: 'block-icon' })
      text(icon, handle.icon)
      header.append(icon)
    }

    if (handle.title) {
      const title = el('h3', { class: 'block-title' })
      text(title, () => handle.title ?? '')
      if (handle.subtitle) {
        const sub = el('small', { class: 'block-subtitle' })
        text(sub, () => handle.subtitle ?? '')
        title.append(sub)
      }
      header.append(title)
    }

    const options = el('div', { class: 'block-options' })
    for (const action of handle.headerActions) {
      options.append(renderAction(action))
    }

    const collapseBtn = el('button', { class: 'btn-block-option' })
    text(collapseBtn, () => handle.collapsed ? '▶' : '▼')
    on(collapseBtn, 'click', handle.toggleCollapse)
    options.append(collapseBtn)

    header.append(options)
    wrapper.append(header)
  }

  // Content
  const content = el('div', { class: 'block-content' })
  show(content, () => !handle.collapsed)
  for (const child of renderPanelContent(handle.content)) {
    content.append(child)
  }
  wrapper.append(content)

  // Loading overlay
  const loader = el('div', { class: 'block-loader' })
  show(loader, () => handle.loading)
  wrapper.append(loader)

  return wrapper
}
```

## Examples

### Simple Card

A block with just a title and content — no actions, no collapse.

```ts
import type { Block } from '@jayobado/dsl-toolkit'

const profileCard: Block = {
  type: 'block',
  header: { title: { content: 'User Profile' } },
  content: {
    type: 'form',
    onSubmit: async (state) => await saveProfile(state),
    items: [
      { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
      { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
    ],
  },
}
```

### Dashboard Stat Widget

A collapsible block with dynamic content and a refresh action.

```ts
import type { Block } from '@jayobado/dsl-toolkit'

const revenueBlock: Block = {
  type: 'block',
  collapsible: true,
  header: {
    title: {
      content: 'Revenue',
      subtitle: () => `Updated ${lastUpdated.value}`,
    },
    icon: '💰',
    actions: [
      { type: 'action', label: 'Refresh', action: 'refresh', icon: '🔄' },
    ],
  },
  content: [
    { type: 'text', content: () => `KES ${revenue.value.toLocaleString()}`, variant: 'heading' },
    { type: 'badge', label: () => `${percentChange.value}% vs last month`, variant: 'success' },
  ],
}
```

### Closable Notification Block

A block that can be dismissed.

```ts
import type { Block } from '@jayobado/dsl-toolkit'

const announcementBlock: Block = {
  type: 'block',
  closable: true,
  header: {
    title: { content: 'Announcement' },
    icon: '📢',
  },
  content: [
    { type: 'text', content: 'New Feature: Dark Mode', variant: 'subheading' },
    'Dark mode is now available in Settings > Appearance. Try it out!',
    { type: 'badge', label: 'New', variant: 'info' },
  ],
}
```

### Table Inside Block

```ts
import type { Block } from '@jayobado/dsl-toolkit'

const usersBlock: Block = {
  type: 'block',
  collapsible: true,
  header: {
    title: { content: 'Users', subtitle: () => `${userCount.value} total` },
    icon: '👤',
    actions: [
      { type: 'action', label: 'Add User', action: 'add-user', icon: '+', variant: 'primary' },
      { type: 'action', label: 'Export', action: 'export', icon: '📥' },
    ],
  },
  content: usersTable,
}
```

### Nested Blocks

Blocks inside blocks — a dashboard with multiple widget sections.

```ts
import type { Block } from '@jayobado/dsl-toolkit'

const dashboard: Block = {
  type: 'block',
  header: { title: { content: 'Dashboard' } },
  content: [
    {
      type: 'block',
      header: {
        title: { content: 'Revenue' },
        icon: '💰',
      },
      content: [
        { type: 'text', content: () => `KES ${revenue.value.toLocaleString()}`, variant: 'heading' },
      ],
    },
    {
      type: 'block',
      header: {
        title: { content: 'Orders' },
        icon: '📦',
      },
      content: [
        { type: 'text', content: () => `${orderCount.value}`, variant: 'heading' },
      ],
    },
    {
      type: 'block',
      collapsible: true,
      header: {
        title: { content: 'Recent Activity' },
        icon: '📊',
      },
      content: activityTable,
    },
  ],
}
```

### Loading State

```ts
import { defineComponent, h } from 'vue'
import { resolveBlock } from '@jayobado/dsl-toolkit'
import { renderBlock } from './vue-block'

export default defineComponent({
  setup() {
    const handle = resolveBlock(dataBlock, (action) => {
      if (action === 'refresh') {
        handle.setLoading(true)
        fetchData()
          .then(() => handle.setLoading(false))
          .catch(() => handle.setLoading(false))
      }
      if (action === 'close') {
        // Block is already hidden via handle.close()
        // Clean up if needed
      }
    })

    // Initial load
    handle.setLoading(true)
    fetchData().then(() => handle.setLoading(false))

    return () => renderBlock(handle)
  },
})
```

### Block with Form and Submit

```ts
import { defineComponent, h } from 'vue'
import { resolveBlock } from '@jayobado/dsl-toolkit'
import { renderBlock } from './vue-block'
import { renderAction } from './vue-actions'
import { resolveAction } from '@jayobado/dsl-toolkit'
import type { Block, Action } from '@jayobado/dsl-toolkit'

const editBlock: Block = {
  type: 'block',
  header: {
    title: { content: 'Edit User' },
    icon: '✏️',
  },
  content: {
    type: 'form',
    validateOn: 'blur',
    onSubmit: async (state) => {
      await fetch('/api/users', { method: 'PUT', body: JSON.stringify(state) })
    },
    items: [
      { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
      { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
    ],
  },
}

const saveAction: Action = {
  type: 'action',
  label: 'Save',
  action: 'submit',
  variant: 'primary',
}

export default defineComponent({
  setup() {
    // Block handle captures form handle via renderPanelContent
    const handle = resolveBlock(editBlock)

    return () => h('div', {}, [
      renderBlock(handle),
      renderAction(resolveAction(saveAction, {
        onAction: (action) => {
          if (action === 'submit') {
            // Form handle available from renderPanelContent's onFormReady
          }
        },
      })),
    ])
  },
})
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Block` | Node — `id?`, `header?`, `content`, `collapsible?`, `closable?`, `defaultCollapsed?` |
| `BlockHeader` | Header — `title?`, `icon?`, `actions?` |
| `BlockTitle` | Title — `content`, `subtitle?` (both string or callback) |

### Resolver

| Export | Description |
|--------|-------------|
| `resolveBlock(block, onAction?)` | Resolves block — returns `BlockHandle` |
| `BlockHandle` | Handle — `title?`, `subtitle?`, `icon?`, `content`, `headerActions`, `hidden`, `collapsed`, `loading`, `toggleCollapse`, `close`, `setLoading` |