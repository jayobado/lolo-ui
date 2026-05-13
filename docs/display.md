# Display & Content

Display types are read-only content items — text blocks, badges, and images. They're not nodes. They don't extend `Node`, don't appear in `NodeType`, and don't need engines or resolvers. They're richer alternatives to plain strings inside container content.

`PanelContent` is the shared content union used by all container nodes. It defines what can appear inside modals, tabs, and steps.

## PanelContent

```ts
type PanelContent = string | Form | Table | Alert | Display
```

Defined in `content.ts` at the library root. Imported by `modal/types.ts`, `tabs/types.ts`, and `steps/types.ts`.

The renderer dispatches each item by checking its `type`:

- `string` — render as text (paragraph)
- `'form'` — use the form engine
- `'table'` — use the table engine
- `'alert'` — use the alert resolver
- `'text'` — render as styled text
- `'badge'` — render as an inline label
- `'image'` — render as an image

## Display Types

### TextDisplay

A block of text with a style variant.

```ts
interface TextDisplay {
  type: 'text'
  content: string | (() => string)
  variant?: string
}
```

`content` — the text to display. A string or a callback for dynamic content via closures.

`variant` — style hint. The renderer maps it to CSS. Common values: `'heading'`, `'subheading'`, `'body'`, `'caption'`, `'code'`. Any string works — the library doesn't enforce a set.

```ts
// Static heading
{ type: 'text', content: 'Welcome', variant: 'heading' }

// Dynamic body text
{ type: 'text', content: () => `${items.value.length} items selected`, variant: 'body' }

// Code block
{ type: 'text', content: 'npm install @jayobado/dsl-toolkit', variant: 'code' }
```

### Badge

An inline label with a severity/status variant.

```ts
interface Badge {
  type: 'badge'
  label: string | (() => string)
  variant?: string
}
```

`label` — display text. String or callback.

`variant` — style hint. Common values: `'info'`, `'warning'`, `'error'`, `'success'`, `'neutral'`.

```ts
// Static
{ type: 'badge', label: 'Active', variant: 'success' }

// Dynamic
{ type: 'badge', label: () => `${count.value} pending`, variant: 'warning' }
```

### ImageDisplay

An image with alt text and optional dimensions.

```ts
interface ImageDisplay {
  type: 'image'
  src: string | (() => string)
  alt: string
  width?: number
  height?: number
}
```

`src` — image URL. String or callback for dynamic sources.

```ts
// Static
{ type: 'image', src: '/logo.png', alt: 'Company logo', width: 120, height: 40 }

// Dynamic
{ type: 'image', src: () => user.value.avatarUrl, alt: 'User avatar', width: 64, height: 64 }
```

### Display Union

```ts
type Display = TextDisplay | Badge | ImageDisplay
```

Discriminated by `type`: `'text'`, `'badge'`, `'image'`.

## Rendering Panel Content

Every container renderer (modal, tabs, steps) needs to render `PanelContent` arrays. This is a shared concern — the same dispatch logic appears in every container. The project should write one `renderPanelContent` function per framework and reuse it across all containers.

### Vue 3

```ts
// vue-content.ts

import { h, reactive } from 'vue'
import type { VNode } from 'vue'
import type { PanelContent, Form, FormHandle } from '@jayobado/dsl-toolkit'
import { collectDefaults, resolveAlert } from '@jayobado/dsl-toolkit'
import { engine as formEngine } from './vue-form'
import { renderAlert } from './vue-alert'

function resolveContent(value: string | (() => string)): string {
  return typeof value === 'function' ? value() : value
}

export function renderPanelContent(
  items: PanelContent[],
  onFormReady?: (index: number, handle: FormHandle) => void
): VNode[] {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return h('p', {}, item)
    }

    switch ((item as any).type) {
      case 'form': {
        const form = item as Form
        const state = reactive({ ...collectDefaults(form.items) })
        const errors = reactive<Record<string, string | undefined>>({})
        return formEngine.render(form, {
          state,
          errors,
          onReady: (handle) => onFormReady?.(index, handle),
        })
      }

      case 'alert':
        return renderAlert(resolveAlert(item as any))

      case 'text':
        return h('p', {
          class: `text text--${(item as any).variant ?? 'body'}`,
        }, resolveContent((item as any).content))

      case 'badge':
        return h('span', {
          class: `badge badge--${(item as any).variant ?? 'neutral'}`,
        }, resolveContent((item as any).label))

      case 'image':
        return h('img', {
          src: resolveContent((item as any).src),
          alt: (item as any).alt,
          width: (item as any).width,
          height: (item as any).height,
        })

      default:
        return h('div', {}, '[unsupported content]')
    }
  })
}
```

Usage in container renderers — all import the same function:

```ts
// vue-modal.ts
import { renderPanelContent } from './vue-content'

// Inside modal render
const formHandles: Record<number, FormHandle> = {}
const contentVNodes = renderPanelContent(resolved.content, (index, handle) => {
  formHandles[index] = handle
})
```

```ts
// vue-tabs.ts
import { renderPanelContent } from './vue-content'

// Inside tab panel render
h('div', { class: 'tab-panel' }, renderPanelContent(tab.content))
```

```ts
// vue-steps.ts
import { renderPanelContent } from './vue-content'

// Inside step panel render
h('div', { class: 'step-panel' }, renderPanelContent(step.content))
```

### lolo-ui

```ts
// lolo-content.ts

import { el, text, show, attr } from '@jayobado/lolo-ui'
import type { PanelContent, Form, FormHandle } from '@jayobado/dsl-toolkit'
import { collectDefaults, resolveAlert } from '@jayobado/dsl-toolkit'
import { reactiveObject } from '@jayobado/lolo-ui'
import { engine as formEngine } from './lolo-form'
import { renderAlert } from './lolo-alert'

function resolveContent(value: string | (() => string)): string {
  return typeof value === 'function' ? value() : value
}

export function renderPanelContent(
  items: PanelContent[],
  onFormReady?: (index: number, handle: FormHandle) => void
): HTMLElement[] {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      const p = el('p')
      text(p, item)
      return p
    }

    switch ((item as any).type) {
      case 'form': {
        const form = item as Form
        const state = reactiveObject({ ...collectDefaults(form.items) })
        const errors = reactiveObject({})
        return formEngine.render(form, {
          state,
          errors,
          onReady: (handle) => onFormReady?.(index, handle),
        })
      }

      case 'alert':
        return renderAlert(resolveAlert(item as any))

      case 'text': {
        const p = el('p', { class: `text text--${(item as any).variant ?? 'body'}` })
        text(p, () => resolveContent((item as any).content))
        return p
      }

      case 'badge': {
        const span = el('span', { class: `badge badge--${(item as any).variant ?? 'neutral'}` })
        text(span, () => resolveContent((item as any).label))
        return span
      }

      case 'image': {
        const img = el('img', {
          alt: (item as any).alt,
          width: (item as any).width,
          height: (item as any).height,
        })
        attr(img, 'src', () => resolveContent((item as any).src))
        return img
      }

      default:
        return el('div')
    }
  })
}
```

## Examples

### Mixed Content in a Modal

```ts
import type { Modal } from '@jayobado/dsl-toolkit'

const welcomeModal: Modal = {
  type: 'modal',
  title: 'Welcome',
  closable: true,
  closeAction: 'dismiss',
  toggle: () => !hasSeenWelcome.value ? undefined : 'hide',
  content: [
    { type: 'image', src: '/onboarding-hero.png', alt: 'Welcome illustration', width: 400 },
    { type: 'text', content: 'Welcome to the Dashboard', variant: 'heading' },
    { type: 'text', content: 'Here are a few things to get you started.', variant: 'body' },
    {
      type: 'alert',
      message: 'Complete your profile to unlock all features.',
      severity: 'info',
    },
  ],
}
```

### Rich Tab Content

```ts
import type { Tabs } from '@jayobado/dsl-toolkit'

const dashboardTabs: Tabs = {
  type: 'tabs',
  defaultTab: 'overview',
  items: [
    {
      key: 'overview',
      label: 'Overview',
      content: [
        { type: 'text', content: 'Dashboard Overview', variant: 'heading' },
        { type: 'text', content: () => `Last updated: ${lastUpdated.value}`, variant: 'caption' },
        {
          type: 'badge',
          label: () => `${activeUsers.value} users online`,
          variant: 'success',
        },
        {
          type: 'alert',
          message: 'System update scheduled for tonight.',
          severity: 'warning',
          dismissible: true,
          dismissAction: 'dismiss-update',
        },
      ],
    },
    {
      key: 'users',
      label: 'Users',
      content: usersTable,
    },
  ],
}
```

### Step with Display Content

```ts
import type { Steps } from '@jayobado/dsl-toolkit'

const setupWizard: Steps = {
  type: 'steps',
  linear: true,
  items: [
    {
      key: 'welcome',
      label: 'Welcome',
      content: [
        { type: 'image', src: '/setup-icon.png', alt: 'Setup', width: 80, height: 80 },
        { type: 'text', content: 'Setup Wizard', variant: 'heading' },
        { type: 'text', content: 'This wizard will guide you through the initial configuration. It takes about 5 minutes.', variant: 'body' },
      ],
    },
    {
      key: 'config',
      label: 'Configure',
      content: configForm,
    },
    {
      key: 'done',
      label: 'Done',
      content: [
        { type: 'text', content: 'Setup Complete!', variant: 'heading' },
        { type: 'text', content: 'Your account is ready to use.', variant: 'body' },
        { type: 'badge', label: 'All systems go', variant: 'success' },
      ],
    },
  ],
}
```

### Dynamic Content

```ts
// Badge that updates based on state
{
  type: 'badge',
  label: () => `${cart.value.length} items in cart`,
  variant: cart.value.length > 0 ? 'info' : 'neutral',
}

// Text that reflects form state
{
  type: 'text',
  content: () => `Hello, ${userName.value}. You have ${notifications.value} unread messages.`,
  variant: 'body',
}

// Image with dynamic source
{
  type: 'image',
  src: () => user.value.avatarUrl ?? '/default-avatar.png',
  alt: 'Profile photo',
  width: 64,
  height: 64,
}
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `PanelContent` | `string \| Form \| Table \| Alert \| Display` |
| `Display` | `TextDisplay \| Badge \| ImageDisplay` |
| `TextDisplay` | `{ type: 'text', content, variant? }` |
| `Badge` | `{ type: 'badge', label, variant? }` |
| `ImageDisplay` | `{ type: 'image', src, alt, width?, height? }` |

### Shared

| File | Description |
|------|-------------|
| `content.ts` | Exports `PanelContent` — imported by modal, tabs, steps |
| `display/types.ts` | Exports `TextDisplay`, `Badge`, `ImageDisplay`, `Display` |