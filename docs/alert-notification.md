# Alert & Notification

Two related but distinct patterns for communicating messages to the user.

**Alerts** are declarative — inline banners that sit in the page layout, with conditional visibility via `toggle`. They're a node type like forms and actions.

**Notifications (toasts)** are imperative — fire-and-forget messages triggered by events. They're not a node type. They're a utility: `createNotifier` returns a manager that pushes and auto-dismisses messages.

## Alert

An inline banner with a message, severity, and optional dismiss button. Alerts live in the page layout and are conditionally visible based on state.

```ts
import type { Alert } from '@jayobado/dsl-toolkit'

const sessionWarning: Alert = {
  type: 'alert',
  message: 'Your session expires in 5 minutes.',
  severity: 'warning',
  dismissible: true,
  dismissAction: 'dismiss-session-warning',
  toggle: () => sessionExpiring.value ? undefined : 'hide',
}
```

### Types

#### Alert

```ts
type Severity = 'info' | 'warning' | 'error' | 'success'

interface Alert extends Node {
  type: 'alert'
  message: string | (() => string)
  severity: Severity
  dismissible?: boolean
  dismissAction?: string
}
```

`message` — display text. Can be a string or a callback for dynamic messages. The callback uses closures to read reactive state.

`severity` — visual importance. The renderer maps this to colors and icons.

`dismissible` — whether the alert has a close button. Defaults to `false`.

`dismissAction` — action string emitted when the dismiss button is clicked. The caller handles the actual dismissal (e.g., setting a boolean to false).

`toggle` — inherited from Node. Controls visibility. Uses closures over external state.

#### ResolvedAlert

```ts
interface ResolvedAlert {
  readonly message: string
  severity: string
  dismissible: boolean
  readonly hidden: boolean
  dismiss?: () => void
}
```

`message` is a getter — dynamic messages re-evaluate on every read. `dismiss` is present only when the alert is dismissible and has a `dismissAction`.

#### resolveAlert

```ts
function resolveAlert(alert: Alert, onAction?: (action: string) => void): ResolvedAlert
```

Resolves the alert — evaluates message, binds dismiss callback.

### Framework Integration

#### Vue 3

```ts
// vue-alert.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { ResolvedAlert } from '@jayobado/dsl-toolkit'

export function renderAlert(alert: ResolvedAlert): VNode | null {
  if (alert.hidden) return null

  return h('div', {
    class: `alert alert--${alert.severity}`,
    role: 'alert',
  }, [
    h('span', { class: 'alert-message' }, alert.message),
    alert.dismiss
      ? h('button', {
          class: 'alert-dismiss',
          onClick: alert.dismiss,
        }, '×')
      : null,
  ])
}
```

#### lolo-ui

```ts
// lolo-alert.ts

import { el, text, show, on } from '@jayobado/lolo-ui'
import type { ResolvedAlert } from '@jayobado/dsl-toolkit'

export function renderAlert(alert: ResolvedAlert): HTMLElement {
  const wrapper = el('div', { class: `alert alert--${alert.severity}`, role: 'alert' })
  show(wrapper, () => !alert.hidden)

  const msg = el('span', { class: 'alert-message' })
  text(msg, () => alert.message)
  wrapper.append(msg)

  if (alert.dismiss) {
    const btn = el('button', { class: 'alert-dismiss' })
    text(btn, '×')
    on(btn, 'click', alert.dismiss)
    wrapper.append(btn)
  }

  return wrapper
}
```

### Examples

#### Static Warning

```ts
const maintenanceAlert: Alert = {
  type: 'alert',
  message: 'Scheduled maintenance tonight at 10pm EAT.',
  severity: 'warning',
}
```

#### Dynamic Message

```ts
const errorSummary: Alert = {
  type: 'alert',
  message: () => `${errorCount.value} fields have errors. Please fix them before submitting.`,
  severity: 'error',
  toggle: () => errorCount.value > 0 ? undefined : 'hide',
}
```

#### Dismissible Success

```ts
const savedAlert: Alert = {
  type: 'alert',
  message: 'Changes saved successfully.',
  severity: 'success',
  dismissible: true,
  dismissAction: 'dismiss-saved',
  toggle: () => showSaved.value ? undefined : 'hide',
}

// In the action handler
onAction: (action) => {
  if (action === 'dismiss-saved') showSaved.value = false
}
```

#### Alert Inside a Form Page

```ts
import { defineComponent, ref, h } from 'vue'
import { form } from './vue-form'
import { renderAlert } from './vue-alert'
import { renderAction } from './vue-actions'
import { resolveAlert, resolveAction } from '@jayobado/dsl-toolkit'
import type { Alert, Action } from '@jayobado/dsl-toolkit'

export default defineComponent({
  setup() {
    const showError = ref(false)
    const showSuccess = ref(false)

    const errorAlert: Alert = {
      type: 'alert',
      message: 'Failed to save. Please try again.',
      severity: 'error',
      dismissible: true,
      dismissAction: 'dismiss-error',
      toggle: () => showError.value ? undefined : 'hide',
    }

    const successAlert: Alert = {
      type: 'alert',
      message: 'User saved successfully.',
      severity: 'success',
      dismissible: true,
      dismissAction: 'dismiss-success',
      toggle: () => showSuccess.value ? undefined : 'hide',
    }

    const f = form({
      type: 'form',
      validateOn: 'blur',
      onSubmit: async (state) => {
        try {
          await fetch('/api/users', { method: 'POST', body: JSON.stringify(state) })
          showSuccess.value = true
          showError.value = false
        } catch {
          showError.value = true
          showSuccess.value = false
        }
      },
      items: [
        { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
        { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
      ],
    })

    const onAlertAction = (action: string) => {
      if (action === 'dismiss-error') showError.value = false
      if (action === 'dismiss-success') showSuccess.value = false
    }

    return () => h('div', {}, [
      renderAlert(resolveAlert(errorAlert, onAlertAction)),
      renderAlert(resolveAlert(successAlert, onAlertAction)),
      f.render(),
      h('button', { onClick: () => f.submit() }, 'Save'),
    ])
  },
})
```

---

## Notification (Toast)

Toast notifications are imperative — triggered by events, not declared in a layout. The `createNotifier` factory returns a manager that pushes messages, auto-dismisses them after a duration, and notifies subscribers when the list changes.

```ts
import { createNotifier } from '@jayobado/dsl-toolkit'

const notifier = createNotifier({ duration: 4000 })

// Fire notifications from anywhere
notifier.notify({ message: 'User saved', severity: 'success' })
notifier.notify({ message: 'Delete failed', severity: 'error', duration: 0 })
notifier.notify({ message: 'Maintenance in 30 minutes', severity: 'warning', dismissible: true })
```

### Types

#### Notification

```ts
interface Notification {
  id: string
  message: string
  severity: Severity
  duration: number
  dismissible: boolean
}
```

`id` — generated by the notifier. Used for programmatic dismissal.

`duration` — milliseconds before auto-dismiss. `0` means persistent — must be dismissed manually or programmatically.

#### NotifyOptions

```ts
interface NotifyOptions {
  message: string
  severity?: Severity
  duration?: number
  dismissible?: boolean
}
```

What you pass to `notifier.notify()`. All fields except `message` have defaults.

#### Notifier

```ts
interface Notifier {
  notify: (options: NotifyOptions) => string
  dismiss: (id: string) => void
  readonly notifications: Notification[]
  subscribe: (callback: () => void) => () => void
}
```

`notify` — pushes a notification. Returns the generated `id` for programmatic dismissal.

`dismiss` — removes a notification by `id`.

`notifications` — current list. The renderer reads this to display active notifications.

`subscribe` — registers a callback that fires when the list changes (push, dismiss, auto-dismiss). Returns an unsubscribe function.

#### createNotifier

```ts
function createNotifier(defaults?: {
  duration?: number
  dismissible?: boolean
}): Notifier
```

Creates a notifier instance. Defaults apply to every notification unless overridden per-call. Default duration is `5000ms`. Default dismissible is `true`.

### Framework Integration

#### Vue 3 — provide/inject

The notifier is a shared service. Vue's `provide`/`inject` makes it available to any component without imports or global state.

**Plugin:**

```ts
// notifier-plugin.ts

import { provide, inject } from 'vue'
import type { InjectionKey } from 'vue'
import { createNotifier } from '@jayobado/dsl-toolkit'
import type { Notifier } from '@jayobado/dsl-toolkit'

const NotifierKey: InjectionKey<Notifier> = Symbol('notifier')

export function provideNotifier(defaults?: { duration?: number; dismissible?: boolean }): Notifier {
  const notifier = createNotifier(defaults)
  provide(NotifierKey, notifier)
  return notifier
}

export function useNotifier(): Notifier {
  const notifier = inject(NotifierKey)
  if (!notifier) throw new Error('No notifier provided. Call provideNotifier() in a parent component.')
  return notifier
}
```

**Renderer:**

```ts
// vue-notifications.ts

import { h, ref, onMounted, onUnmounted } from 'vue'
import type { VNode } from 'vue'
import type { Notifier, Notification } from '@jayobado/dsl-toolkit'

export function useNotifications(notifier: Notifier) {
  const list = ref<Notification[]>([...notifier.notifications])

  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    unsubscribe = notifier.subscribe(() => {
      list.value = [...notifier.notifications]
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return {
    render: (): VNode => {
      return h('div', { class: 'notification-container' },
        list.value.map(n =>
          h('div', {
            key: n.id,
            class: `notification notification--${n.severity}`,
            role: 'alert',
          }, [
            h('span', { class: 'notification-message' }, n.message),
            n.dismissible
              ? h('button', {
                  class: 'notification-dismiss',
                  onClick: () => notifier.dismiss(n.id),
                }, '×')
              : null,
          ])
        )
      )
    },
  }
}
```

**Root component:**

```ts
import { defineComponent, h } from 'vue'
import { provideNotifier } from './notifier-plugin'
import { useNotifications } from './vue-notifications'

export default defineComponent({
  setup() {
    const notifier = provideNotifier({ duration: 4000 })
    const notifications = useNotifications(notifier)

    return () => h('div', { class: 'app' }, [
      // ... router view, layout, etc
      notifications.render(),
    ])
  },
})
```

**Any child component:**

```ts
import { defineComponent } from 'vue'
import { useNotifier } from './notifier-plugin'

export default defineComponent({
  setup() {
    const notifier = useNotifier()

    async function saveUser(state: Record<string, unknown>) {
      try {
        await fetch('/api/users', { method: 'POST', body: JSON.stringify(state) })
        notifier.notify({ message: 'User saved', severity: 'success' })
      } catch {
        notifier.notify({ message: 'Failed to save', severity: 'error', duration: 0 })
      }
    }

    return { saveUser }
  },
})
```

No imports from the root component. The notifier flows through Vue's dependency injection.

#### lolo-ui

```ts
// lolo-notifications.ts

import { el, text, on } from '@jayobado/lolo-ui'
import type { Notifier } from '@jayobado/dsl-toolkit'

export function mountNotifications(notifier: Notifier, target: HTMLElement) {
  const container = el('div', { class: 'notification-container' })
  target.append(container)

  function rebuild() {
    container.innerHTML = ''

    for (const n of notifier.notifications) {
      const wrapper = el('div', {
        class: `notification notification--${n.severity}`,
        role: 'alert',
      })

      const msg = el('span', { class: 'notification-message' })
      text(msg, n.message)
      wrapper.append(msg)

      if (n.dismissible) {
        const btn = el('button', { class: 'notification-dismiss' })
        text(btn, '×')
        on(btn, 'click', () => notifier.dismiss(n.id))
        wrapper.append(btn)
      }

      container.append(wrapper)
    }
  }

  notifier.subscribe(rebuild)
  rebuild()

  return container
}
```

Usage:

```ts
import { mount, el } from '@jayobado/lolo-ui'
import { createNotifier } from '@jayobado/dsl-toolkit'
import { mountNotifications } from './lolo-notifications'

const notifier = createNotifier()

const app = el('div', { class: 'app' })
// ... build page content
mountNotifications(notifier, app)
mount('#app', app)

// Anywhere with access to notifier
notifier.notify({ message: 'Saved!', severity: 'success' })
```

### Examples

#### After Form Submit

```ts
const notifier = useNotifier()
const f = form(userFormDef)

// In action handler
onAction: (action) => {
  if (action === 'submit') {
    try {
      f.submit()
      notifier.notify({ message: 'User created', severity: 'success' })
    } catch {
      notifier.notify({ message: 'Failed to create user', severity: 'error', duration: 0 })
    }
  }
}
```

#### After Table Row Action

```ts
const notifier = useNotifier()

onAction: (action, row) => {
  if (action === 'delete') {
    await deleteUser(row.id)
    notifier.notify({ message: `${row.name} deleted`, severity: 'info' })
  }
}
```

#### Persistent System Warning

```ts
notifier.notify({
  message: 'System maintenance scheduled for tonight at 10pm EAT.',
  severity: 'warning',
  duration: 0,
  dismissible: true,
})
```

#### Programmatic Dismissal

```ts
const id = notifier.notify({
  message: 'Uploading...',
  severity: 'info',
  duration: 0,
  dismissible: false,
})

await uploadFile(file)

notifier.dismiss(id)
notifier.notify({ message: 'Upload complete', severity: 'success' })
```

## API Reference

### Alert

| Type / Export | Description |
|--------------|-------------|
| `Alert` | Node — `message`, `severity`, `dismissible?`, `dismissAction?`, `toggle?` |
| `Severity` | `'info' \| 'warning' \| 'error' \| 'success'` |
| `resolveAlert(alert, onAction?)` | Resolves alert — returns `ResolvedAlert` |
| `ResolvedAlert` | Ready to render — `message`, `severity`, `dismissible`, `hidden`, `dismiss?` |

### Notification

| Type / Export | Description |
|--------------|-------------|
| `createNotifier(defaults?)` | Factory — returns `Notifier` |
| `Notifier` | Manager — `notify`, `dismiss`, `notifications`, `subscribe` |
| `Notification` | Active notification — `id`, `message`, `severity`, `duration`, `dismissible` |
| `NotifyOptions` | Input to `notify()` — `message`, `severity?`, `duration?`, `dismissible?` |