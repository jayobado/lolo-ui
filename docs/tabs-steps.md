# Tabs & Steps

Two container nodes for multi-panel interfaces. Both show one panel at a time. They differ in navigation: tabs allow free switching, steps enforce sequential progression.

Both use resolvers with handles — the handle manages active state, and the renderer reads from it.

## Tabs

Tabbed panels with free navigation. Each tab has a key, label, and content. The user clicks any visible, enabled tab to switch.

```ts
import type { Tabs } from '@jayobado/dsl-toolkit'

const settingsTabs: Tabs = {
  type: 'tabs',
  defaultTab: 'profile',
  items: [
    { key: 'profile', label: 'Profile', icon: '👤', content: profileForm },
    { key: 'security', label: 'Security', icon: '🔒', content: securityForm },
    {
      key: 'admin',
      label: 'Admin',
      icon: '⚙️',
      toggle: () => currentUser.role === 'admin' ? undefined : 'hide',
      content: 'Admin settings go here.',
    },
  ],
}
```

### Types

#### Tabs

```ts
interface Tabs extends Node {
  type: 'tabs'
  defaultTab?: string
  items: TabPanel[]
}
```

`defaultTab` — key of the initially active tab. Defaults to the first item's key.

#### TabPanel

```ts
interface TabPanel {
  key: string
  label: string
  icon?: string
  content: PanelContent | PanelContent[]
  toggle?: (context: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

`TabPanel` is not a node — it's a structural part of `Tabs`. It has its own `toggle` for conditional visibility per tab.

`toggle` returns:
- `undefined` — tab is visible and clickable
- `'hide'` — tab is hidden entirely
- `'disable'` — tab header is visible but greyed out and not clickable

`content` follows the same pattern as modals — a string, a node definition (Form, Table, Alert), or an array of both.

#### PanelContent

```ts
type PanelContent = string | Form | Table | Alert
```

The renderer dispatches each item by type: strings become text, forms use the form engine, tables use the table engine, alerts use the alert resolver.

### Resolver

#### resolveTabs

```ts
function resolveTabs(tabs: Tabs): TabsHandle
```

Creates a handle that manages active tab state and resolves all tab panels.

#### TabsHandle

```ts
interface TabsHandle {
  readonly activeKey: string
  setActive: (key: string) => void
  readonly tabs: ResolvedTab[]
}
```

`activeKey` — the currently active tab's key. A getter — always returns the current value.

`setActive` — switch to a tab by key. Ignored if the tab is hidden or disabled.

`tabs` — all resolved tab panels.

#### ResolvedTab

```ts
interface ResolvedTab {
  key: string
  label: string
  icon?: string
  content: PanelContent[]
  readonly hidden: boolean
  readonly disabled: boolean
  readonly active: boolean
}
```

All state properties are getters. `content` is normalized to an array. `active` re-evaluates on every read — when `setActive` changes the active key, all tabs' `active` getters reflect the change.

### Framework Integration

#### Vue 3

```ts
// vue-tabs.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { TabsHandle, PanelContent } from '@jayobado/dsl-toolkit'
import type { Form, FormHandle } from '@jayobado/dsl-toolkit'
import { collectDefaults } from '@jayobado/dsl-toolkit'
import { resolveAlert } from '@jayobado/dsl-toolkit'
import { reactive } from 'vue'
import { engine as formEngine } from './vue-form'
import { renderAlert } from './vue-alert'

function renderPanelContent(items: PanelContent[]): VNode[] {
  return items.map((item, index) => {
    if (typeof item === 'string') return h('p', {}, item)

    if ((item as any).type === 'form') {
      const form = item as Form
      const state = reactive({ ...collectDefaults(form.items) })
      const errors = reactive<Record<string, string | undefined>>({})
      return formEngine.render(form, { state, errors })
    }

    if ((item as any).type === 'alert') {
      return renderAlert(resolveAlert(item as any))
    }

    return h('div', {}, '[unsupported content]')
  })
}

export function renderTabs(handle: TabsHandle): VNode {
  return h('div', { class: 'tabs' }, [
    h('div', { class: 'tabs-header' },
      handle.tabs
        .filter(t => !t.hidden)
        .map(tab =>
          h('button', {
            class: ['tab-button', { active: tab.active, disabled: tab.disabled }],
            disabled: tab.disabled,
            onClick: () => handle.setActive(tab.key),
          }, [
            tab.icon ? h('span', { class: 'tab-icon' }, tab.icon) : null,
            tab.label,
          ])
        )
    ),
    ...handle.tabs
      .filter(t => t.active)
      .map(tab =>
        h('div', { class: 'tab-panel' }, renderPanelContent(tab.content))
      ),
  ])
}
```

Usage:

```ts
import { defineComponent, h } from 'vue'
import { resolveTabs } from '@jayobado/dsl-toolkit'
import { renderTabs } from './vue-tabs'
import type { Tabs } from '@jayobado/dsl-toolkit'

const settingsTabs: Tabs = {
  type: 'tabs',
  defaultTab: 'profile',
  items: [
    {
      key: 'profile',
      label: 'Profile',
      icon: '👤',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async (state) => {
          await fetch('/api/profile', { method: 'PUT', body: JSON.stringify(state) })
        },
        items: [
          { name: 'displayName', type: 'text', label: 'Display Name', rules: { required: true } },
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
          { name: 'bio', type: 'textarea', label: 'Bio' },
        ],
      },
    },
    {
      key: 'security',
      label: 'Security',
      icon: '🔒',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async (state) => {
          await fetch('/api/security', { method: 'PUT', body: JSON.stringify(state) })
        },
        items: [
          { name: 'currentPassword', type: 'password', label: 'Current Password', rules: { required: true } },
          { name: 'newPassword', type: 'password', label: 'New Password', rules: { required: true, minLength: 8 } },
          { name: 'confirmPassword', type: 'password', label: 'Confirm', rules: { required: true, match: 'newPassword' } },
        ],
      },
    },
    {
      key: 'admin',
      label: 'Admin',
      icon: '⚙️',
      toggle: () => currentUser.role === 'admin' ? undefined : 'hide',
      content: 'Admin-only settings will appear here.',
    },
  ],
}

export default defineComponent({
  setup() {
    const handle = resolveTabs(settingsTabs)

    return () => h('div', {}, [
      h('h1', {}, 'Settings'),
      renderTabs(handle),
    ])
  },
})
```

#### lolo-ui

```ts
// lolo-tabs.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import type { TabsHandle, PanelContent } from '@jayobado/dsl-toolkit'
import type { Form } from '@jayobado/dsl-toolkit'
import { collectDefaults } from '@jayobado/dsl-toolkit'
import { resolveAlert } from '@jayobado/dsl-toolkit'
import { reactiveObject } from '@jayobado/lolo-ui'
import { engine as formEngine } from './lolo-form'
import { renderAlert } from './lolo-alert'

function renderPanelContent(items: PanelContent[]): HTMLElement[] {
  return items.map(item => {
    if (typeof item === 'string') {
      const p = el('p')
      text(p, item)
      return p
    }

    if ((item as any).type === 'form') {
      const form = item as Form
      const state = reactiveObject({ ...collectDefaults(form.items) })
      const errors = reactiveObject({})
      return formEngine.render(form, { state, errors })
    }

    if ((item as any).type === 'alert') {
      return renderAlert(resolveAlert(item as any))
    }

    return el('div')
  })
}

export function renderTabs(handle: TabsHandle): HTMLElement {
  const wrapper = el('div', { class: 'tabs' })

  const header = el('div', { class: 'tabs-header' })
  for (const tab of handle.tabs) {
    const btn = el('button', { class: 'tab-button' })
    show(btn, () => !tab.hidden)
    attr(btn, 'disabled', () => tab.disabled)
    attr(btn, 'class', () => `tab-button ${tab.active ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`)
    on(btn, 'click', () => handle.setActive(tab.key))

    if (tab.icon) btn.append(el('span', { class: 'tab-icon' }, text(tab.icon)))
    btn.append(text(tab.label))
    header.append(btn)
  }
  wrapper.append(header)

  for (const tab of handle.tabs) {
    const panel = el('div', { class: 'tab-panel' })
    show(panel, () => tab.active)
    for (const child of renderPanelContent(tab.content)) {
      panel.append(child)
    }
    wrapper.append(panel)
  }

  return wrapper
}
```

---

## Steps

Sequential multi-step panels with navigation controls. The user progresses through steps in order. In linear mode, steps must be completed sequentially. In non-linear mode, the user can jump back to any visited step.

```ts
import type { Steps } from '@jayobado/dsl-toolkit'

const registrationSteps: Steps = {
  type: 'steps',
  linear: true,
  items: [
    { key: 'account', label: 'Account', content: accountForm },
    { key: 'profile', label: 'Profile', content: profileForm },
    { key: 'confirm', label: 'Confirm', content: 'Review your information and click Complete.' },
  ],
}
```

### Types

#### Steps

```ts
interface Steps extends Node {
  type: 'steps'
  linear?: boolean
  items: StepPanel[]
}
```

`linear` — whether steps must be completed in order. Defaults to `true`. When `false`, the user can jump to any visited step.

#### StepPanel

```ts
interface StepPanel {
  key: string
  label: string
  content: PanelContent | PanelContent[]
}
```

`StepPanel` is not a node. No `toggle` — steps are sequential. If you need conditional steps, build the items array dynamically before creating the definition.

### Resolver

#### resolveSteps

```ts
function resolveSteps(steps: Steps): StepsHandle
```

Creates a handle that manages step navigation, visited tracking, and panel resolution.

#### StepsHandle

```ts
interface StepsHandle {
  readonly activeIndex: number
  readonly activeKey: string
  readonly isFirst: boolean
  readonly isLast: boolean
  readonly steps: ResolvedStep[]
  next: () => void
  back: () => void
  goTo: (index: number) => void
}
```

`activeIndex` / `activeKey` — current step. Getters.

`isFirst` / `isLast` — convenience getters for rendering navigation buttons.

`next` — advance to the next step. Marks it as visited. No-op on the last step.

`back` — go to the previous step. No-op on the first step.

`goTo` — jump to a step by index. In linear mode, only visited steps are accessible. Out-of-bounds indices are ignored.

#### ResolvedStep

```ts
interface ResolvedStep {
  key: string
  label: string
  content: PanelContent[]
  readonly active: boolean
  readonly visited: boolean
  readonly accessible: boolean
}
```

`active` — whether this is the current step.

`visited` — whether the user has been to this step.

`accessible` — whether the user can navigate to this step. In linear mode, only visited steps and the next unvisited step are accessible. In non-linear mode, all visited steps are accessible.

### Framework Integration

#### Vue 3

```ts
// vue-steps.ts

import { h } from 'vue'
import type { VNode } from 'vue'
import type { StepsHandle, PanelContent } from '@jayobado/dsl-toolkit'

// renderPanelContent is the same as in vue-tabs.ts

export function renderSteps(
  handle: StepsHandle,
  options?: { onComplete?: () => void }
): VNode {
  return h('div', { class: 'steps' }, [
    // Step indicators
    h('div', { class: 'steps-header' },
      handle.steps.map((step, index) =>
        h('button', {
          class: [
            'step-indicator',
            {
              active: step.active,
              visited: step.visited,
              accessible: step.accessible,
            },
          ],
          disabled: !step.accessible,
          onClick: () => handle.goTo(index),
        }, [
          h('span', { class: 'step-number' }, String(index + 1)),
          h('span', { class: 'step-label' }, step.label),
        ])
      )
    ),

    // Active step content
    ...handle.steps
      .filter(s => s.active)
      .map(step =>
        h('div', { class: 'step-panel' }, renderPanelContent(step.content))
      ),

    // Navigation
    h('div', { class: 'steps-nav' }, [
      h('button', {
        type: 'button',
        disabled: handle.isFirst,
        onClick: () => handle.back(),
      }, '← Back'),

      handle.isLast
        ? h('button', {
            type: 'button',
            class: 'btn--primary',
            onClick: () => options?.onComplete?.(),
          }, 'Complete')
        : h('button', {
            type: 'button',
            onClick: () => handle.next(),
          }, 'Next →'),
    ]),
  ])
}
```

Usage:

```ts
import { defineComponent, h } from 'vue'
import { resolveSteps } from '@jayobado/dsl-toolkit'
import { renderSteps } from './vue-steps'
import type { Steps } from '@jayobado/dsl-toolkit'

const registrationSteps: Steps = {
  type: 'steps',
  linear: true,
  items: [
    {
      key: 'account',
      label: 'Account',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async () => {},
        items: [
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
          {
            name: 'password',
            type: 'password',
            label: 'Password',
            rules: {
              required: true,
              minLength: { value: 8, message: 'At least 8 characters' },
            },
          },
        ],
      },
    },
    {
      key: 'profile',
      label: 'Profile',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async () => {},
        items: [
          { name: 'firstName', type: 'text', label: 'First Name', rules: { required: true } },
          { name: 'lastName', type: 'text', label: 'Last Name', rules: { required: true } },
          { name: 'phone', type: 'text', label: 'Phone' },
        ],
      },
    },
    {
      key: 'confirm',
      label: 'Confirm',
      content: [
        'Review your information and click Complete to finish registration.',
        {
          type: 'alert',
          message: 'By completing registration you agree to the Terms of Service.',
          severity: 'info',
        },
      ],
    },
  ],
}

export default defineComponent({
  setup() {
    const handle = resolveSteps(registrationSteps)

    return () => h('div', {}, [
      h('h1', {}, 'Register'),
      renderSteps(handle, {
        onComplete: async () => {
          await fetch('/api/register', { method: 'POST', body: JSON.stringify({}) })
          router.push('/dashboard')
        },
      }),
    ])
  },
})
```

#### lolo-ui

```ts
// lolo-steps.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import type { StepsHandle, PanelContent } from '@jayobado/dsl-toolkit'

// renderPanelContent is the same as in lolo-tabs.ts

export function renderSteps(
  handle: StepsHandle,
  options?: { onComplete?: () => void }
): HTMLElement {
  const wrapper = el('div', { class: 'steps' })

  // Step indicators
  const header = el('div', { class: 'steps-header' })
  handle.steps.forEach((step, index) => {
    const btn = el('button', { class: 'step-indicator' })
    attr(btn, 'disabled', () => !step.accessible)
    attr(btn, 'class', () =>
      `step-indicator ${step.active ? 'active' : ''} ${step.visited ? 'visited' : ''}`
    )
    on(btn, 'click', () => handle.goTo(index))

    const num = el('span', { class: 'step-number' })
    text(num, String(index + 1))
    btn.append(num)

    const label = el('span', { class: 'step-label' })
    text(label, step.label)
    btn.append(label)

    header.append(btn)
  })
  wrapper.append(header)

  // Step panels
  for (const step of handle.steps) {
    const panel = el('div', { class: 'step-panel' })
    show(panel, () => step.active)
    for (const child of renderPanelContent(step.content)) {
      panel.append(child)
    }
    wrapper.append(panel)
  }

  // Navigation
  const nav = el('div', { class: 'steps-nav' })

  const backBtn = el('button', { type: 'button' })
  text(backBtn, '← Back')
  attr(backBtn, 'disabled', () => handle.isFirst)
  on(backBtn, 'click', () => handle.back())
  nav.append(backBtn)

  const nextBtn = el('button', { type: 'button' })
  text(nextBtn, () => handle.isLast ? 'Complete' : 'Next →')
  on(nextBtn, 'click', () => {
    if (handle.isLast) {
      options?.onComplete?.()
    } else {
      handle.next()
    }
  })
  nav.append(nextBtn)

  wrapper.append(nav)
  return wrapper
}
```

## Examples

### Settings Tabs

Tabs with forms, conditional admin tab, and icons.

```ts
import type { Tabs } from '@jayobado/dsl-toolkit'

const settingsTabs: Tabs = {
  type: 'tabs',
  defaultTab: 'profile',
  items: [
    {
      key: 'profile',
      label: 'Profile',
      icon: '👤',
      content: {
        type: 'form',
        onSubmit: async (state) => await saveProfile(state),
        items: [
          { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
        ],
      },
    },
    {
      key: 'appearance',
      label: 'Appearance',
      icon: '🎨',
      content: {
        type: 'form',
        onSubmit: async (state) => await saveAppearance(state),
        items: [
          {
            name: 'theme',
            type: 'select',
            label: 'Theme',
            options: [
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'System', value: 'system' },
            ],
          },
        ],
      },
    },
    {
      key: 'admin',
      label: 'Admin',
      icon: '⚙️',
      toggle: () => currentUser.role === 'admin' ? undefined : 'hide',
      content: 'Admin settings.',
    },
  ],
}
```

### Disabled Tab Until Condition Met

```ts
import type { Tabs } from '@jayobado/dsl-toolkit'

const onboardingTabs: Tabs = {
  type: 'tabs',
  items: [
    {
      key: 'basics',
      label: 'Basics',
      content: basicsForm,
    },
    {
      key: 'advanced',
      label: 'Advanced',
      toggle: () => basicsComplete.value ? undefined : 'disable',
      content: advancedForm,
    },
    {
      key: 'review',
      label: 'Review',
      toggle: () => advancedComplete.value ? undefined : 'disable',
      content: 'Review your settings before saving.',
    },
  ],
}
```

### Mixed Content Tabs

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
        'Welcome to your dashboard.',
        {
          type: 'alert',
          message: 'You have 3 pending tasks.',
          severity: 'info',
        },
      ],
    },
    {
      key: 'users',
      label: 'Users',
      content: usersTable,
    },
    {
      key: 'settings',
      label: 'Settings',
      content: settingsForm,
    },
  ],
}
```

### Registration Wizard

A linear step-by-step form.

```ts
import type { Steps } from '@jayobado/dsl-toolkit'

const registration: Steps = {
  type: 'steps',
  linear: true,
  items: [
    {
      key: 'account',
      label: 'Account',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async () => {},
        items: [
          { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
          { name: 'password', type: 'password', label: 'Password', rules: { required: true, minLength: 8 } },
        ],
      },
    },
    {
      key: 'profile',
      label: 'Profile',
      content: {
        type: 'form',
        validateOn: 'blur',
        onSubmit: async () => {},
        items: [
          { name: 'firstName', type: 'text', label: 'First Name', rules: { required: true } },
          { name: 'lastName', type: 'text', label: 'Last Name', rules: { required: true } },
        ],
      },
    },
    {
      key: 'confirm',
      label: 'Confirm',
      content: [
        'Review your information and click Complete.',
        {
          type: 'alert',
          message: 'By registering you agree to the Terms of Service.',
          severity: 'info',
        },
      ],
    },
  ],
}
```

### Non-Linear Steps

Steps where the user can jump back freely.

```ts
import type { Steps } from '@jayobado/dsl-toolkit'

const surveySteps: Steps = {
  type: 'steps',
  linear: false,
  items: [
    {
      key: 'demographics',
      label: 'Demographics',
      content: demographicsForm,
    },
    {
      key: 'preferences',
      label: 'Preferences',
      content: preferencesForm,
    },
    {
      key: 'feedback',
      label: 'Feedback',
      content: feedbackForm,
    },
  ],
}
```

### Steps with Mixed Content

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
        'Welcome to the setup wizard. This will guide you through configuring your account.',
        {
          type: 'alert',
          message: 'This process takes about 5 minutes.',
          severity: 'info',
        },
      ],
    },
    {
      key: 'config',
      label: 'Configuration',
      content: configForm,
    },
    {
      key: 'import',
      label: 'Import Data',
      content: [
        'Optionally import data from an existing system.',
        importForm,
      ],
    },
    {
      key: 'done',
      label: 'Done',
      content: 'Setup complete! You can now start using the application.',
    },
  ],
}
```

## API Reference

### Tabs

| Type / Export | Description |
|--------------|-------------|
| `Tabs` | Node — `defaultTab?`, `items` |
| `TabPanel` | Panel — `key`, `label`, `icon?`, `content`, `toggle?` |
| `PanelContent` | `string \| Form \| Table \| Alert` |
| `resolveTabs(tabs)` | Resolves tabs — returns `TabsHandle` |
| `TabsHandle` | Handle — `activeKey`, `setActive`, `tabs` |
| `ResolvedTab` | Resolved panel — `key`, `label`, `icon?`, `content`, `hidden`, `disabled`, `active` |

### Steps

| Type / Export | Description |
|--------------|-------------|
| `Steps` | Node — `linear?`, `items` |
| `StepPanel` | Panel — `key`, `label`, `content` |
| `resolveSteps(steps)` | Resolves steps — returns `StepsHandle` |
| `StepsHandle` | Handle — `activeIndex`, `activeKey`, `isFirst`, `isLast`, `steps`, `next`, `back`, `goTo` |
| `ResolvedStep` | Resolved panel — `key`, `label`, `content`, `active`, `visited`, `accessible` |