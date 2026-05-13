# Accordion

Collapsible sections where each panel can be independently expanded or collapsed. Unlike tabs where one panel is active, an accordion can have zero, one, or multiple panels open simultaneously.

```ts
import type { Accordion } from '@jayobado/dsl-toolkit'

const faq: Accordion = {
  type: 'accordion',
  multiple: true,
  defaultOpen: ['what'],
  items: [
    { key: 'what', label: 'What is dsl-toolkit?', content: 'A framework-agnostic UI toolkit.' },
    { key: 'why', label: 'Why data-driven UIs?', content: 'Serializable, testable, portable.' },
    { key: 'how', label: 'How do I start?', content: 'Install, define, implement handlers, render.' },
  ],
}
```

## Types

### Accordion

```ts
interface Accordion extends Node {
  type: 'accordion'
  items: AccordionPanel[]
  multiple?: boolean
  defaultOpen?: string[]
}
```

`multiple` — whether multiple panels can be open at the same time. Defaults to `true`. When `false`, opening one panel closes all others — single-expand behavior.

`defaultOpen` — keys of panels that start expanded. Defaults to empty — all panels start collapsed.

### AccordionPanel

```ts
interface AccordionPanel {
  key: string
  label: string
  icon?: string
  content: PanelContent | PanelContent[]
  toggle?: (context: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

`AccordionPanel` is not a node — it's a structural part of `Accordion`.

`toggle` controls the panel's visibility and interactivity:
- `undefined` — panel is visible and can be expanded/collapsed
- `'hide'` — panel is hidden entirely
- `'disable'` — panel header is visible but greyed out and can't be toggled

`content` uses `PanelContent` — strings, forms, tables, alerts, and display types. See [Display & Content](./display.md).

## Resolver

### resolveAccordion

```ts
function resolveAccordion(accordion: Accordion): AccordionHandle
```

Creates a handle that manages open/close state for all panels.

### AccordionHandle

```ts
interface AccordionHandle {
  readonly panels: ResolvedAccordionPanel[]
  open: (key: string) => void
  close: (key: string) => void
  togglePanel: (key: string) => void
}
```

`panels` — all resolved panels with live state getters.

`open` — expand a panel by key. When `multiple` is `false`, closes all others first. Ignored if the panel is hidden or disabled.

`close` — collapse a panel by key.

`togglePanel` — flip a panel's open state. Convenience method — calls the panel's own `toggle()`.

### ResolvedAccordionPanel

```ts
interface ResolvedAccordionPanel {
  key: string
  label: string
  icon?: string
  content: PanelContent[]
  readonly hidden: boolean
  readonly disabled: boolean
  readonly open: boolean
  toggle: () => void
}
```

All state properties are getters — `hidden`, `disabled`, and `open` re-evaluate on every read.

`toggle` — the renderer binds this to the panel header click. When `multiple` is `false`, toggling one panel closed-then-open clears the others. Disabled panels ignore toggle calls.

`content` is normalized to an array.

## Framework Integration

### Vue 3

#### Renderer

```ts
// vue-accordion.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { AccordionHandle } from '@jayobado/dsl-toolkit'
import { renderPanelContent } from './vue-content'

export function renderAccordion(handle: AccordionHandle): VNode {
  return h('div', { class: 'accordion' },
    handle.panels
      .filter(p => !p.hidden)
      .map(panel =>
        h('div', {
          class: ['accordion-panel', { open: panel.open, disabled: panel.disabled }],
        }, [
          h('button', {
            class: 'accordion-header',
            disabled: panel.disabled,
            onClick: panel.toggle,
          }, [
            panel.icon ? h('span', { class: 'accordion-icon' }, panel.icon) : null,
            h('span', { class: 'accordion-label' }, panel.label),
            h('span', { class: 'accordion-chevron' }, panel.open ? '▼' : '▶'),
          ]),
          panel.open
            ? h('div', { class: 'accordion-body' }, renderPanelContent(panel.content))
            : null,
        ])
      )
  )
}
```

#### Usage

```ts
import { defineComponent, h } from 'vue'
import { resolveAccordion } from '@jayobado/dsl-toolkit'
import { renderAccordion } from './vue-accordion'
import type { Accordion } from '@jayobado/dsl-toolkit'

const faq: Accordion = {
  type: 'accordion',
  multiple: true,
  defaultOpen: ['what'],
  items: [
    {
      key: 'what',
      label: 'What is dsl-toolkit?',
      content: 'A framework-agnostic toolkit for defining UIs as plain data.',
    },
    {
      key: 'why',
      label: 'Why data-driven UIs?',
      content: [
        'Data-driven UIs are serializable, testable, and portable.',
        { type: 'text', content: 'The same definition works with any renderer.', variant: 'caption' },
      ],
    },
    {
      key: 'how',
      label: 'How do I get started?',
      content: [
        'Install the library, define your UI, implement handlers, render.',
        { type: 'badge', label: 'Takes 5 minutes', variant: 'success' },
      ],
    },
  ],
}

export default defineComponent({
  setup() {
    const handle = resolveAccordion(faq)
    return () => renderAccordion(handle)
  },
})
```

### lolo-ui

#### Renderer

```ts
// lolo-accordion.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import type { AccordionHandle } from '@jayobado/dsl-toolkit'
import { renderPanelContent } from './lolo-content'

export function renderAccordion(handle: AccordionHandle): HTMLElement {
  const wrapper = el('div', { class: 'accordion' })

  for (const panel of handle.panels) {
    const section = el('div', { class: 'accordion-panel' })
    show(section, () => !panel.hidden)

    const header = el('button', { class: 'accordion-header' })
    attr(header, 'disabled', () => panel.disabled)
    on(header, 'click', panel.toggle)

    if (panel.icon) header.append(el('span', { class: 'accordion-icon' }, text(panel.icon)))
    header.append(el('span', { class: 'accordion-label' }, text(panel.label)))

    const chevron = el('span', { class: 'accordion-chevron' })
    text(chevron, () => panel.open ? '▼' : '▶')
    header.append(chevron)

    section.append(header)

    const body = el('div', { class: 'accordion-body' })
    show(body, () => panel.open)
    for (const child of renderPanelContent(panel.content)) {
      body.append(child)
    }
    section.append(body)

    wrapper.append(section)
  }

  return wrapper
}
```

#### Usage

```ts
import { mount } from '@jayobado/lolo-ui'
import { resolveAccordion } from '@jayobado/dsl-toolkit'
import { renderAccordion } from './lolo-accordion'

const handle = resolveAccordion(faq)
mount('#app', renderAccordion(handle))
```

## Examples

### FAQ Section

```ts
import type { Accordion } from '@jayobado/dsl-toolkit'

const faq: Accordion = {
  type: 'accordion',
  multiple: true,
  defaultOpen: ['what'],
  items: [
    {
      key: 'what',
      label: 'What is dsl-toolkit?',
      content: 'A framework-agnostic toolkit for defining UIs as plain data and rendering them with any framework.',
    },
    {
      key: 'frameworks',
      label: 'Which frameworks are supported?',
      content: 'Any framework that can produce elements from function calls. Vue, React, lolo-ui, Solid, Svelte, lit-html, and more.',
    },
    {
      key: 'license',
      label: 'What license is it under?',
      content: 'MIT.',
    },
  ],
}
```

### Single-Expand Settings

An accordion where only one section is open at a time.

```ts
import type { Accordion } from '@jayobado/dsl-toolkit'

const settingsAccordion: Accordion = {
  type: 'accordion',
  multiple: false,
  defaultOpen: ['general'],
  items: [
    {
      key: 'general',
      label: 'General Settings',
      icon: '⚙️',
      content: {
        type: 'form',
        onSubmit: async (state) => await saveGeneral(state),
        items: [
          { name: 'siteName', type: 'text', label: 'Site Name', rules: { required: true } },
          { name: 'language', type: 'select', label: 'Language',
            options: [
              { label: 'English', value: 'en' },
              { label: 'Swahili', value: 'sw' },
            ],
          },
        ],
      },
    },
    {
      key: 'notifications',
      label: 'Notification Settings',
      icon: '🔔',
      content: {
        type: 'form',
        onSubmit: async (state) => await saveNotifications(state),
        items: [
          { name: 'emailNotify', type: 'checkbox', label: 'Email Notifications', default: true },
          { name: 'pushNotify', type: 'checkbox', label: 'Push Notifications', default: false },
        ],
      },
    },
    {
      key: 'danger',
      label: 'Danger Zone',
      icon: '⚠️',
      content: [
        {
          type: 'alert',
          message: 'These actions are irreversible.',
          severity: 'error',
        },
        'Deleting your account will remove all data permanently.',
      ],
    },
  ],
}
```

### Conditional Panels

Panels that hide or disable based on state.

```ts
import type { Accordion } from '@jayobado/dsl-toolkit'

const adminAccordion: Accordion = {
  type: 'accordion',
  multiple: true,
  items: [
    {
      key: 'users',
      label: 'User Management',
      content: usersTable,
    },
    {
      key: 'billing',
      label: 'Billing',
      toggle: () => currentUser.plan === 'free' ? 'disable' : undefined,
      content: billingForm,
    },
    {
      key: 'system',
      label: 'System Administration',
      toggle: () => currentUser.role === 'admin' ? undefined : 'hide',
      content: systemForm,
    },
  ],
}
```

### Mixed Content

```ts
import type { Accordion } from '@jayobado/dsl-toolkit'

const helpAccordion: Accordion = {
  type: 'accordion',
  multiple: true,
  items: [
    {
      key: 'getting-started',
      label: 'Getting Started',
      icon: '🚀',
      content: [
        { type: 'text', content: 'Quick Start Guide', variant: 'heading' },
        'Follow these steps to set up your account.',
        { type: 'image', src: '/guide-screenshot.png', alt: 'Setup guide', width: 400 },
      ],
    },
    {
      key: 'api',
      label: 'API Reference',
      icon: '📖',
      content: [
        { type: 'text', content: 'API Documentation', variant: 'heading' },
        { type: 'text', content: 'All endpoints require authentication.', variant: 'body' },
        { type: 'badge', label: 'v2.1', variant: 'info' },
      ],
    },
    {
      key: 'support',
      label: 'Contact Support',
      icon: '💬',
      content: {
        type: 'form',
        onSubmit: async (state) => await submitTicket(state),
        items: [
          { name: 'subject', type: 'text', label: 'Subject', rules: { required: true } },
          { name: 'message', type: 'textarea', label: 'Message', rules: { required: true } },
        ],
      },
    },
  ],
}
```

### Programmatic Control

```ts
import { defineComponent, h } from 'vue'
import { resolveAccordion } from '@jayobado/dsl-toolkit'
import { renderAccordion } from './vue-accordion'

export default defineComponent({
  setup() {
    const handle = resolveAccordion(faqAccordion)

    return () => h('div', {}, [
      // Control buttons
      h('div', { class: 'accordion-controls' }, [
        h('button', { onClick: () => handle.open('all-sections') }, 'Expand All'),
        h('button', {
          onClick: () => {
            for (const panel of handle.panels) {
              handle.close(panel.key)
            }
          },
        }, 'Collapse All'),
      ]),

      renderAccordion(handle),
    ])
  },
})
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Accordion` | Node — `items`, `multiple?`, `defaultOpen?` |
| `AccordionPanel` | Panel — `key`, `label`, `icon?`, `content`, `toggle?` |

### Resolver

| Export | Description |
|--------|-------------|
| `resolveAccordion(accordion)` | Resolves accordion — returns `AccordionHandle` |
| `AccordionHandle` | Handle — `panels`, `open`, `close`, `togglePanel` |
| `ResolvedAccordionPanel` | Resolved — `key`, `label`, `icon?`, `content`, `hidden`, `disabled`, `open`, `toggle` |