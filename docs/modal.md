# Modal Node

The modal node defines dialogs and modals as plain data — title, size, content, and footer actions. Modals can contain strings, forms, or tables. Footer actions compose with the [Action Node](./action.md). When a modal contains a form, the footer's submit action triggers the form's submission through the `FormHandle`.

Like actions, modals have no engine — just types and a resolver.

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const confirmDelete: Modal = {
  type: 'modal',
  title: 'Confirm Delete',
  size: 'sm',
  closable: true,
  closeAction: 'cancel',
  toggle: () => showConfirm.value ? undefined : 'hide',
  content: 'Are you sure you want to delete this user? This action cannot be undone.',
  footer: [
    { type: 'action', label: 'Cancel', action: 'cancel' },
    { type: 'action', label: 'Delete', action: 'confirm-delete', variant: 'danger' },
  ],
}
```

## Types

### Modal

```ts
interface Modal extends Node {
  type: 'modal'
  title?: string
  size?: string
  closable?: boolean
  closeAction?: string
  content?: ModalItem | ModalItem[]
  footer?: Action[]
}
```

`title` — header text. Optional for custom headers.

`size` — size hint for the renderer. Common values: `'sm'`, `'md'`, `'lg'`, `'full'`. Defaults to `'md'`. The library doesn't enforce a set — any string works.

`closable` — whether the modal has a close button and can be dismissed by clicking the overlay. Defaults to `true`.

`closeAction` — action string emitted when the close button or overlay is clicked. The caller handles it the same way as any footer action.

`content` — the modal's body. A string, a node definition (Form, Table), or an array of both. See ModalItem below.

`footer` — action definitions rendered at the bottom. Uses the [Action type](./action.md). The resolver evaluates toggles and binds callbacks.

`toggle` — inherited from Node. Controls modal visibility. Uses closures over external state — no context parameter needed.

### ModalItem

What can appear in a modal's content.

```ts
type ModalItem = string | Form | Table
```

The renderer dispatches each item by type: strings become text, forms use the form engine, tables use the table engine.

```ts
// String — rendered as text
content: 'Are you sure?'

// Form — rendered with form engine
content: {
  type: 'form',
  onSubmit: async (state) => { ... },
  items: [
    { name: 'name', type: 'text', label: 'Name' },
  ],
}

// Mixed — array of strings and nodes
content: [
  'Upload a CSV file to import users.',
  importForm,
]
```

## Resolver

### ResolvedModal

```ts
interface ResolvedModal {
  title?: string
  size: string
  closable: boolean
  closeAction?: string
  content: ModalItem[]
  footer: ResolvedAction[]
  readonly hidden: boolean
}
```

`content` is always normalized to an array. `footer` contains resolved actions with `execute` bound. `hidden` is a getter that re-evaluates the modal's `toggle` on every read.

No `disabled` — a modal is either visible or hidden. There's no "visible but disabled" state for an overlay.

### resolveModal

```ts
function resolveModal(modal: Modal, onAction?: (action: string) => void): ResolvedModal
```

Resolves the modal shell and its footer actions. Content is normalized but not resolved — the renderer handles content dispatch to the appropriate engine.

`onAction` is passed through to footer action resolution. When a footer button is clicked, `onAction` fires with the action string.

## Visibility

Modal visibility uses `toggle` with closures — the same pattern as all other nodes, but modals close over external state rather than reading from a context parameter.

```ts
import { ref } from 'vue'

const showModal = ref(false)

const modal: Modal = {
  type: 'modal',
  title: 'Edit User',
  toggle: () => showModal.value ? undefined : 'hide',
  content: editUserForm,
  footer: [
    { type: 'action', label: 'Cancel', action: 'close' },
    { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
  ],
}

// Open: showModal.value = true
// Close: showModal.value = false (in onAction handler)
```

The toggle callback ignores its parameter and reads from the closure. This works because the definition is created in application code where the relevant state is in scope.

## Form Integration

When a modal contains a form, the footer's submit action needs to trigger the form's submission. The modal factory captures the form's `FormHandle` via `onReady` and exposes a `submit` method.

```ts
// Definition
const editModal: Modal = {
  type: 'modal',
  title: 'Edit User',
  toggle: () => showEdit.value ? undefined : 'hide',
  content: {
    type: 'form',
    onSubmit: async (state) => {
      await fetch('/api/users', { method: 'PUT', body: JSON.stringify(state) })
      showEdit.value = false
    },
    items: [
      { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
      { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
    ],
  },
  footer: [
    { type: 'action', label: 'Cancel', action: 'close' },
    { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
  ],
}

// The modal factory wires submit automatically
const m = modal(editModal)

// In the render function
m.render((action) => {
  if (action === 'submit') m.submit()  // triggers form validation + onSubmit
  if (action === 'close') showEdit.value = false
})
```

The caller still controls the wiring — `m.submit()` is explicit. The modal factory just makes the form handle accessible.

## Framework Integration

### Vue 3

#### Factory

```ts
// vue-modal.ts

import { h, reactive } from 'vue'
import type { VNode } from 'vue'
import { resolveModal, collectDefaults } from '@jayobado/dsl-toolkit'
import type { Modal, ModalItem, Form, FormHandle, ResolvedAction } from '@jayobado/dsl-toolkit'
import { renderAction } from './vue-actions'
import { engine as formEngine } from './vue-form'

export function modal(definition: Modal) {
  const formHandles: Record<number, FormHandle> = {}
  const formStates: Record<number, {
    state: Record<string, unknown>
    errors: Record<string, string | undefined>
  }> = {}

  function renderContent(items: ModalItem[]): VNode[] {
    return items.map((item, index) => {
      if (typeof item === 'string') {
        return h('p', {}, item)
      }

      if ((item as any).type === 'form') {
        const form = item as Form

        if (!formStates[index]) {
          formStates[index] = {
            state: reactive({ ...collectDefaults(form.items) }),
            errors: reactive({}),
          }
        }

        return formEngine.render(form, {
          ...formStates[index],
          onReady: (handle) => { formHandles[index] = handle },
        })
      }

      // Table or other node types — extend as needed
      return h('div', {}, '[unsupported content type]')
    })
  }

  return {
    render: (onAction: (action: string) => void): VNode | null => {
      const resolved = resolveModal(definition, onAction)
      if (resolved.hidden) return null

      return h('div', { class: 'modal-overlay', onClick: (e: Event) => {
        if (e.target === e.currentTarget && resolved.closable) {
          onAction(resolved.closeAction ?? 'close')
        }
      }}, [
        h('div', { class: `modal modal--${resolved.size}` }, [
          // Header
          resolved.title
            ? h('div', { class: 'modal-header' }, [
                h('h2', {}, resolved.title),
                resolved.closable
                  ? h('button', {
                      class: 'modal-close',
                      onClick: () => onAction(resolved.closeAction ?? 'close'),
                    }, '×')
                  : null,
              ])
            : null,

          // Body
          h('div', { class: 'modal-body' }, renderContent(resolved.content)),

          // Footer
          resolved.footer.length > 0
            ? h('div', { class: 'modal-footer' }, resolved.footer.map(renderAction))
            : null,
        ]),
      ])
    },

    submit: () => {
      const handle = Object.values(formHandles)[0]
      handle?.submit()
    },
  }
}
```

#### Usage — Confirmation Dialog

```ts
import { defineComponent, ref, h } from 'vue'
import { modal } from './vue-modal'
import type { Modal } from '@jayobado/dsl-toolkit'

export default defineComponent({
  setup() {
    const showConfirm = ref(false)
    const userToDelete = ref<Record<string, unknown> | null>(null)

    const confirmModal: Modal = {
      type: 'modal',
      title: 'Confirm Delete',
      size: 'sm',
      closable: true,
      closeAction: 'cancel',
      toggle: () => showConfirm.value ? undefined : 'hide',
      content: 'Are you sure you want to delete this user? This action cannot be undone.',
      footer: [
        { type: 'action', label: 'Cancel', action: 'cancel' },
        { type: 'action', label: 'Delete', action: 'confirm-delete', variant: 'danger' },
      ],
    }

    const m = modal(confirmModal)

    return () => h('div', {}, [
      h('button', {
        onClick: () => {
          userToDelete.value = { id: 1, name: 'Alice' }
          showConfirm.value = true
        },
      }, 'Delete User'),

      m.render((action) => {
        if (action === 'confirm-delete') {
          deleteUser(userToDelete.value)
          showConfirm.value = false
        }
        if (action === 'cancel') {
          showConfirm.value = false
        }
      }),
    ])
  },
})
```

#### Usage — Edit Form in Modal

```ts
import { defineComponent, ref, h } from 'vue'
import { modal } from './vue-modal'
import type { Modal } from '@jayobado/dsl-toolkit'

export default defineComponent({
  setup() {
    const showEdit = ref(false)

    const editModal: Modal = {
      type: 'modal',
      title: 'Edit User',
      size: 'md',
      closable: true,
      closeAction: 'close',
      toggle: () => showEdit.value ? undefined : 'hide',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async (state) => {
          await fetch('/api/users', { method: 'PUT', body: JSON.stringify(state) })
          showEdit.value = false
        },
        items: [
          { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
          {
            name: 'role',
            type: 'select',
            label: 'Role',
            options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' },
            ],
          },
        ],
      },
      footer: [
        { type: 'action', label: 'Cancel', action: 'close' },
        { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
      ],
    }

    const m = modal(editModal)

    return () => h('div', {}, [
      h('button', { onClick: () => { showEdit.value = true } }, 'Edit User'),

      m.render((action) => {
        if (action === 'submit') m.submit()
        if (action === 'close') showEdit.value = false
      }),
    ])
  },
})
```

#### Usage — Mixed Content

```ts
import { defineComponent, ref, h } from 'vue'
import { modal } from './vue-modal'
import type { Modal } from '@jayobado/dsl-toolkit'

export default defineComponent({
  setup() {
    const showImport = ref(false)

    const importModal: Modal = {
      type: 'modal',
      title: 'Import Users',
      size: 'md',
      closable: true,
      closeAction: 'close',
      toggle: () => showImport.value ? undefined : 'hide',
      content: [
        'Upload a CSV file with user data. The file should contain name, email, and role columns.',
        {
          type: 'form',
          onSubmit: async (state) => {
            await uploadCsv(state.file)
            showImport.value = false
          },
          items: [
            {
              name: 'file',
              type: 'text',
              label: 'File Path',
              rules: { required: true },
            },
            {
              name: 'overwrite',
              type: 'checkbox',
              label: 'Overwrite existing users',
              default: false,
            },
          ],
        },
        'Existing users with matching emails will be updated if overwrite is enabled.',
      ],
      footer: [
        { type: 'action', label: 'Cancel', action: 'close' },
        { type: 'action', label: 'Import', action: 'submit', variant: 'primary' },
      ],
    }

    const m = modal(importModal)

    return () => h('div', {}, [
      h('button', { onClick: () => { showImport.value = true } }, 'Import Users'),

      m.render((action) => {
        if (action === 'submit') m.submit()
        if (action === 'close') showImport.value = false
      }),
    ])
  },
})
```

### lolo-ui (Signals)

#### Factory

```ts
// lolo-modal.ts

import { el, text, show, on, attr } from '@jayobado/lolo-ui'
import { resolveModal, collectDefaults } from '@jayobado/dsl-toolkit'
import type { Modal, ModalItem, Form, FormHandle } from '@jayobado/dsl-toolkit'
import { renderAction } from './lolo-actions'
import { engine as formEngine } from './lolo-form'
import { reactiveObject } from '@jayobado/lolo-ui'

export function modal(definition: Modal) {
  const formHandles: Record<number, FormHandle> = {}

  function renderContent(items: ModalItem[]): HTMLElement[] {
    return items.map((item, index) => {
      if (typeof item === 'string') {
        const p = el('p')
        text(p, item)
        return p
      }

      if ((item as any).type === 'form') {
        const form = item as Form
        const state = reactiveObject({ ...collectDefaults(form.items) })
        const errors = reactiveObject({})

        return formEngine.render(form, {
          state,
          errors,
          onReady: (handle) => { formHandles[index] = handle },
        })
      }

      return el('div')
    })
  }

  return {
    render: (onAction: (action: string) => void): HTMLElement => {
      const resolved = resolveModal(definition, onAction)

      const overlay = el('div', { class: 'modal-overlay' })
      show(overlay, () => !resolved.hidden)

      on(overlay, 'click', (e: Event) => {
        if (e.target === e.currentTarget && resolved.closable) {
          onAction(resolved.closeAction ?? 'close')
        }
      })

      const modalEl = el('div', { class: `modal modal--${resolved.size}` })

      // Header
      if (resolved.title) {
        const header = el('div', { class: 'modal-header' })
        const title = el('h2')
        text(title, resolved.title)
        header.append(title)

        if (resolved.closable) {
          const closeBtn = el('button', { class: 'modal-close' })
          text(closeBtn, '×')
          on(closeBtn, 'click', () => onAction(resolved.closeAction ?? 'close'))
          header.append(closeBtn)
        }

        modalEl.append(header)
      }

      // Body
      const body = el('div', { class: 'modal-body' })
      for (const child of renderContent(resolved.content)) {
        body.append(child)
      }
      modalEl.append(body)

      // Footer
      if (resolved.footer.length > 0) {
        const footer = el('div', { class: 'modal-footer' })
        for (const action of resolved.footer) {
          footer.append(renderAction(action))
        }
        modalEl.append(footer)
      }

      overlay.append(modalEl)
      return overlay
    },

    submit: () => {
      const handle = Object.values(formHandles)[0]
      handle?.submit()
    },
  }
}
```

#### Usage

```ts
import { mount, el, text, on, signal } from '@jayobado/lolo-ui'
import { modal } from './lolo-modal'
import type { Modal } from '@jayobado/dsl-toolkit'

const showEdit = signal(false)

const editModal: Modal = {
  type: 'modal',
  title: 'Edit User',
  closable: true,
  closeAction: 'close',
  toggle: () => showEdit.value ? undefined : 'hide',
  content: {
    type: 'form',
    onSubmit: async (state) => {
      await fetch('/api/users', { method: 'PUT', body: JSON.stringify(state) })
      showEdit.value = false
    },
    items: [
      { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
      { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
    ],
  },
  footer: [
    { type: 'action', label: 'Cancel', action: 'close' },
    { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
  ],
}

const m = modal(editModal)

const page = el('div')

const openBtn = el('button')
text(openBtn, 'Edit User')
on(openBtn, 'click', () => { showEdit.value = true })
page.append(openBtn)

page.append(m.render((action) => {
  if (action === 'submit') m.submit()
  if (action === 'close') showEdit.value = false
}))

mount('#app', page)
```

## Examples

### Confirmation Dialog

The simplest modal — text content with confirm/cancel actions.

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const confirmDelete: Modal = {
  type: 'modal',
  title: 'Confirm Delete',
  size: 'sm',
  closable: true,
  closeAction: 'cancel',
  toggle: () => showConfirm.value ? undefined : 'hide',
  content: 'Are you sure you want to delete this user? This action cannot be undone.',
  footer: [
    { type: 'action', label: 'Cancel', action: 'cancel' },
    { type: 'action', label: 'Delete', action: 'confirm-delete', variant: 'danger' },
  ],
}
```

### Edit Form Modal

A modal containing a form with validation.

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const editUserModal: Modal = {
  type: 'modal',
  title: 'Edit User',
  size: 'md',
  closable: true,
  closeAction: 'close',
  toggle: () => showEdit.value ? undefined : 'hide',
  content: {
    type: 'form',
    validateOn: 'blur',
    onSubmit: async (state) => {
      await fetch('/api/users', { method: 'PUT', body: JSON.stringify(state) })
      showEdit.value = false
    },
    items: [
      { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
      { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
      {
        name: 'role',
        type: 'select',
        label: 'Role',
        rules: { required: true },
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ],
  },
  footer: [
    { type: 'action', label: 'Cancel', action: 'close' },
    { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
  ],
}
```

### Information Modal

A modal with no footer — just informational content.

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const welcomeModal: Modal = {
  type: 'modal',
  title: 'Welcome',
  size: 'md',
  closable: true,
  closeAction: 'dismiss',
  toggle: () => !hasSeenWelcome.value ? undefined : 'hide',
  content: [
    'Welcome to the dashboard! Here are a few things to get you started.',
    'You can manage users, view reports, and configure settings from the sidebar.',
    'Need help? Click the help icon in the top right corner.',
  ],
}
```

### Loading Action in Footer

A modal with a save button that shows loading state during submission.

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const createProjectModal: Modal = {
  type: 'modal',
  title: 'Create Project',
  size: 'md',
  closable: true,
  closeAction: 'close',
  toggle: () => showCreate.value ? undefined : 'hide',
  content: {
    type: 'form',
    validateOn: 'blur',
    onSubmit: async (state) => {
      saving.value = true
      await fetch('/api/projects', { method: 'POST', body: JSON.stringify(state) })
      saving.value = false
      showCreate.value = false
    },
    items: [
      { name: 'name', type: 'text', label: 'Project Name', rules: { required: true } },
      { name: 'description', type: 'textarea', label: 'Description' },
    ],
  },
  footer: [
    { type: 'action', label: 'Cancel', action: 'close' },
    {
      type: 'action',
      label: 'Create',
      action: 'submit',
      variant: 'primary',
      loading: () => saving.value,
    },
  ],
}
```

### Table Inside Modal

A modal displaying a data table.

```ts
import type { Modal, Table } from '@jayobado/dsl-toolkit'

const activityTable: Table = {
  type: 'table',
  columns: [
    { key: 'date', label: 'Date', format: (v) => new Date(v as string).toLocaleDateString() },
    { key: 'action', label: 'Action' },
    { key: 'user', label: 'User' },
  ],
}

const activityModal: Modal = {
  type: 'modal',
  title: 'Activity Log',
  size: 'lg',
  closable: true,
  closeAction: 'close',
  toggle: () => showActivity.value ? undefined : 'hide',
  content: activityTable,
}
```

### Composing Modal with Table Row Actions

A common pattern — clicking "Edit" on a table row opens a modal with a form.

```ts
import { defineComponent, ref, h } from 'vue'
import { table } from './vue-table'
import { modal } from './vue-modal'
import type { Table, Modal } from '@jayobado/dsl-toolkit'

export default defineComponent({
  setup() {
    const showEdit = ref(false)
    const editingUser = ref<Record<string, unknown> | null>(null)

    const userTable: Table = {
      type: 'table',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
      ],
      actions: [
        { label: 'Edit', action: 'edit' },
      ],
    }

    const editModal: Modal = {
      type: 'modal',
      title: 'Edit User',
      closable: true,
      closeAction: 'close',
      toggle: () => showEdit.value ? undefined : 'hide',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async (state) => {
          await fetch(`/api/users/${editingUser.value?.id}`, {
            method: 'PUT',
            body: JSON.stringify(state),
          })
          showEdit.value = false
        },
        items: [
          { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
        ],
      },
      footer: [
        { type: 'action', label: 'Cancel', action: 'close' },
        { type: 'action', label: 'Save', action: 'submit', variant: 'primary' },
      ],
    }

    const t = table(userTable, users, {
      onAction: (action, row) => {
        if (action === 'edit') {
          editingUser.value = row
          showEdit.value = true
        }
      },
    })

    const m = modal(editModal)

    return () => h('div', {}, [
      t.render(),
      m.render((action) => {
        if (action === 'submit') m.submit()
        if (action === 'close') showEdit.value = false
      }),
    ])
  },
})
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Modal` | Root — `title?`, `size?`, `closable?`, `closeAction?`, `content?`, `footer?`, `toggle?` |
| `ModalItem` | Content union — `string \| Form \| Table` |

### Resolver

| Export | Description |
|--------|-------------|
| `resolveModal(modal, onAction?)` | Resolves modal — normalizes content, resolves footer actions |
| `ResolvedModal` | Ready to render — `title?`, `size`, `closable`, `content`, `footer`, `hidden` |