# Form Node

The form node defines stateful forms as plain data — fields, groups, validation rules, and conditional visibility. The form engine walks the definition, manages state and validation, and delegates rendering to handler functions you provide.

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const loginForm: Form = {
  type: 'form',
  onSubmit: async (state) => {
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(state),
    })
  },
  items: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      rules: { required: true },
    },
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
}
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Your Application                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Form     │  │ Handlers │  │ Reactive      │  │
│  │ Defs     │  │ (h, el)  │  │ Wrapper       │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
│  ┌────▼──────────────▼───────────────▼────────┐  │
│  │            createFormEngine()              │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
├───────────────────────┼──────────────────────────┤
│       Library         │                          │
│  ┌────────────────────▼───────────────────────┐  │
│  │    Types + Engine + Built-in Validation    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Types

### Field

A single form field. The `name` identifies it in state, `type` determines how the renderer draws it.

```ts
type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'date'
  | 'email'
  | 'password'
  | (string & {})    // extensible — add your own types

interface Field {
  name: string
  type: FieldType
  label?: string
  placeholder?: string
  hint?: string
  options?: Option[]
  validateOn?: ValidateOn
  rules?: ValidationRules
  default?: string | number | boolean
  toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

`FieldType` includes common types but accepts any string — renderers handle custom types in their field handler's switch statement.

`options` is for `select`, `radio`, and any custom type that needs a list of choices.

`default` is the field's initial value. Fields without `default` start as `undefined`.

`validateOn` overrides the form's default validation trigger for this specific field.

### Option

A choice in a `select` or `radio` field.

```ts
interface Option {
  label: string
  value: string | number | boolean
}
```

### FieldGroup

Groups related fields together. The renderer decides what a group looks like — a fieldset, a card, a section, a tab.

```ts
interface FieldGroup {
  group: string       // key identifier
  label?: string
  items: Item[]
  toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

Groups nest. A group's `toggle` cascades — when a group is disabled, all its children are disabled regardless of their own `toggle`. When a group is hidden, all its children are hidden.

### Item

The union of what can appear in a form's item list.

```ts
type Item = Field | FieldGroup | Repeater
```

Discriminated by: `Field` has `name`, `FieldGroup` has `group`, `Repeater` has `repeater`.

### Repeater

A dynamic list of field groups. The user can add and remove entries. Each entry uses the same template of fields.

```ts
interface Repeater {
  repeater: string
  label?: string
  template: Item[]
  addable?: boolean
  removable?: boolean
  min?: number
  max?: number
  toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

`repeater` — key in form state pointing to an array of objects. Each object holds the field values for one entry.

`template` — the fields (and groups) rendered for each entry. Supports nesting — groups inside templates work for layout.

`addable` — whether the user can add new entries. Defaults to `false`.

`removable` — whether entries can be removed. Defaults to `false`.

`min` — minimum number of entries. Removal is disabled when the count reaches this. Defaults to `0`.

`max` — maximum number of entries. Adding is disabled when the count reaches this. Defaults to `Infinity`.

`toggle` — controls the entire repeater's visibility. When hidden, all entries are hidden. When disabled, all entries are disabled.

```ts
{
  repeater: 'addresses',
  label: 'Addresses',
  addable: true,
  removable: true,
  min: 1,
  max: 5,
  template: [
    { name: 'street', type: 'text', label: 'Street', rules: { required: true } },
    {
      group: 'city-state',
      items: [
        { name: 'city', type: 'text', label: 'City', rules: { required: true } },
        { name: 'state', type: 'text', label: 'State' },
        { name: 'zip', type: 'text', label: 'ZIP', rules: { required: true } },
      ],
    },
    {
      name: 'country',
      type: 'select',
      label: 'Country',
      rules: { required: true },
      options: [
        { label: 'Kenya', value: 'KE' },
        { label: 'Uganda', value: 'UG' },
        { label: 'Tanzania', value: 'TZ' },
      ],
    },
  ],
}
```

State shape:

```ts
{
  addresses: [
    { street: '123 Main St', city: 'Nairobi', state: '', zip: '00100', country: 'KE' },
    { street: '456 Oak Ave', city: 'Mombasa', state: '', zip: '80100', country: 'KE' },
  ],
}
```

**Error keys for repeater fields are dotted** — `addresses.0.street`, `addresses.1.city`. The engine manages this automatically. Field bindings inside repeaters read from the row object and write errors with the prefixed key.

### ValidationRules

Declarative validation rules on a field. Each rule can be a shorthand value or an object with a custom message.

```ts
type RuleValue<T> = T | { value: T; message: string }

interface ValidationRules {
  required?: RuleValue<boolean>
  minLength?: RuleValue<number>
  maxLength?: RuleValue<number>
  min?: RuleValue<number>
  max?: RuleValue<number>
  pattern?: RuleValue<string>
  match?: RuleValue<string>
  custom?: (value: unknown, state: Record<string, unknown>) => string | undefined
}
```

Shorthand uses a default message, explicit provides a custom one:

```ts
// Default message: "Must be at least 8 characters"
rules: { minLength: 8 }

// Custom message
rules: { minLength: { value: 8, message: 'Too short' } }

// Multiple rules
rules: {
  required: true,
  minLength: 8,
  pattern: { value: '[A-Z]', message: 'Needs an uppercase letter' },
}

// Cross-field
rules: { match: { value: 'password', message: 'Passwords do not match' } }

// Callback escape hatch
rules: {
  custom: (value, state) => {
    if (typeof value === 'string' && value.includes('admin'))
      return 'Reserved word'
  }
}
```

Rules evaluate in order: required → minLength → maxLength → pattern → min → max → match → custom. First failure wins.

### ValidateOn

When validation runs for a field.

```ts
type ValidateOn = 'change' | 'blur' | 'submit'
```

- `'change'` — validates on every keystroke/input change
- `'blur'` — validates when the field loses focus
- `'submit'` — validates only on form submission

Set on the form as a default, overridden per field.

### Form

The root container. Self-contained — carries its submit handler, validation strategy, and the full item tree.

```ts
interface Form extends Node {
  type: 'form'
  items: Item[]
  onSubmit: (state: Record<string, unknown>) => void | Promise<void>
  validateOn?: ValidateOn
}
```

`items` is the tree of fields and groups. `onSubmit` is called with the current state when validation passes. `validateOn` defaults to `'submit'`.

### FieldBinding

The contract between the engine and the field handler. The engine creates one per field.

```ts
interface FieldBinding {
  readonly value: unknown
  readonly error: string | undefined
  readonly disabled: boolean
  readonly hidden: boolean
  onChange: (value: unknown) => void
  onBlur: () => void
}
```

All readable properties are getters — they read live from reactive state on every access. This is what makes the same engine work for both re-render frameworks (Vue) and signal frameworks (lolo-ui).

`value` — current value from form state.

`error` — current validation error, or `undefined` if valid.

`disabled` — `true` when the field's `toggle` returns `'disable'` or any ancestor group is disabled. The disabled state cascades through the group tree lazily via chained closures.

`hidden` — `true` when the field's `toggle` returns `'hide'`.

`onChange` — call when the user changes the input. Writes to state and conditionally runs validation. If the trigger is `'change'`, validates immediately. Otherwise clears any existing error so stale messages don't linger while the user is fixing the field.

`onBlur` — call when the input loses focus. Validates if the trigger is `'blur'`.

### GroupBinding

Same concept for groups, less surface.

```ts
interface GroupBinding {
  readonly disabled: boolean
  readonly hidden: boolean
}
```

The group handler uses this to style the group container — dimming it when disabled, hiding it when hidden.

## Engine

### FormConfig

What you provide when creating an engine.

```ts
interface FormConfig<Element> {
  field: FieldHandler<Element>
  group: GroupHandler<Element>
  form: FormHandler<Element>
  repeater: RepeaterHandler<Element>
  validate?: (
    state: Record<string, unknown>,
    context: ValidateContext,
    form: Form
  ) => Record<string, string | undefined>
}
```

Four handlers — one per item type (field, group, form, repeater). One optional external validator.

`validate` replaces built-in rules entirely when present. It receives the full state, a context describing what triggered validation, and the form definition. It returns a map of field name → error message. For repeater fields, error keys are dotted: `addresses.0.street`. The project wires in zod, valibot, or any schema library here.

### Handler Signatures

```ts
type FieldHandler<Element> = (field: Field, binding: FieldBinding) => Element
type GroupHandler<Element> = (group: FieldGroup, children: Element[], binding: GroupBinding) => Element
type FormHandler<Element> = (form: Form, children: Element[]) => Element
type RepeaterHandler<Element> = (repeater: Repeater, rows: RepeaterRow<Element>[], controls: RepeaterControls) => Element
```

The field handler renders one field using its definition and binding. The group handler wraps pre-rendered children. The form handler wraps the form element. The repeater handler renders a dynamic list of entry rows with add/remove controls.

### RepeaterRow

```ts
interface RepeaterRow<Element> {
  index: number
  fields: Element[]
  remove?: () => void
}
```

`index` — the row's position in the array.

`fields` — pre-rendered field elements for this row (from the template).

`remove` — call to remove this row. Present when the repeater is removable and the row count is above `min`. The engine handles splicing the array and cleaning up errors.

### RepeaterControls

```ts
interface RepeaterControls {
  addRow?: () => void
  canAdd: boolean
  canRemove: boolean
}
```

`addRow` — call to append a new row with defaults from the template fields. Present when the repeater is addable and the row count is below `max`.

`canAdd` / `canRemove` — the renderer uses these to enable/disable add and remove buttons.

### ValidateContext

```ts
interface ValidateContext {
  trigger: ValidateOn
  field?: Field
}
```

Passed to external validators. `field` is present on `'change'` and `'blur'`, absent on `'submit'`.

### FormHandle

Exposes form operations to external code. Received through the `onReady` callback in render options.

```ts
interface FormHandle {
  submit: () => void
}
```

`submit` — runs validation on all visible fields and calls `form.onSubmit` if valid. This is how external action buttons trigger form submission.

### FormOptions

```ts
interface FormOptions {
  state?: Record<string, unknown>
  errors?: Record<string, string | undefined>
  reactive?: <T extends Record<string, unknown>>(obj: T) => T
  onReady?: (handle: FormHandle) => void
}
```

Passed to `engine.render()`. All optional.

`state` — pre-built reactive state. Use for edit mode or when the caller needs to own the state object's lifetime (Vue factory pattern). When provided, the engine uses it directly and skips building from field defaults.

`errors` — pre-built reactive errors object. Same ownership pattern as state.

`reactive` — wraps the engine's internally-built state and errors objects with framework reactivity. Only used when `state`/`errors` are not provided. Vue passes `reactive`, lolo-ui passes its signal-backed wrapper.

`onReady` — called after the engine builds the form's internal submit function. Receives a `FormHandle` that exposes `submit`. Use this to wire external action buttons to the form.

### createFormEngine

```ts
function createFormEngine<Element>(
  config: FormConfig<Element>
): { render: (form: Form, options?: FormOptions) => Element }
```

Call once per renderer. Returns an object with a `render` method.

### Exported Utilities

```ts
function collectDefaults(items: Item[]): Record<string, unknown>
function collectFields(items: Item[]): Field[]
function collectRowDefaults(items: Item[]): Record<string, unknown>
```

`collectDefaults` walks the item tree and collects `{ [field.name]: field.default }` for all fields with a default. For repeaters, it builds one default row from the template and sets the array with that single row. Used by framework factories to build reactive state before calling `render()`.

`collectFields` flattens the tree into an array of all `Field` objects (excluding repeater template fields). Useful for resetting, listing field names, or external validation.

`collectRowDefaults` collects defaults from a repeater's template fields into a flat row object. Used internally by the engine for adding new rows. Exported for cases where the caller needs to build custom default rows.

## Toggle

Every field and group has an optional `toggle` callback. It receives the current form state and returns what should happen to the element.

```ts
// Hide when not admin
toggle: (s) => s.role !== 'admin' ? 'hide' : undefined

// Disable when plan is free
toggle: (s) => s.plan === 'free' ? 'disable' : undefined

// Conditional hide or disable
toggle: (s) => {
  if (s.role !== 'admin') return 'hide'
  if (s.plan === 'free') return 'disable'
}
```

Group toggles cascade. When a group is disabled, all fields and nested groups inside it are disabled regardless of their own `toggle`. The cascading is lazy — it's evaluated on every read of `binding.disabled` via chained closures, so it works with both re-render and signal-based frameworks.

## Validation

### Built-in Rules

The engine includes a built-in validator that evaluates `ValidationRules` on each field. Rules run in order, first failure wins.

```ts
{
  name: 'email',
  type: 'email',
  label: 'Email',
  rules: {
    required: true,
    pattern: { value: '.+@.+\\..+', message: 'Enter a valid email' },
  },
}
```

Default messages are generated from the rule type and the field's label. Custom messages override them.

String rules (`minLength`, `maxLength`, `pattern`) only run when the value is a string. Number rules (`min`, `max`) only run when the value is a number. `match` compares against another field's value in state. `custom` is a callback escape hatch.

### External Validators (Zod, Valibot)

When `config.validate` is set on the engine, built-in rules are bypassed entirely. The external validator controls everything.

```ts
import { z } from 'zod'
import { createFormEngine } from '@jayobado/dsl-toolkit'

const schema = z.object({
  email: z.string().min(1, 'Required').email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const engine = createFormEngine<VNode>({
  field: fieldHandler,
  group: groupHandler,
  form: formHandler,
  validate: (state, ctx) => {
    if (ctx.trigger === 'change') return {}

    const result = schema.safeParse(state)
    if (result.success) return {}

    const errors: Record<string, string | undefined> = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      if (ctx.trigger === 'submit' || key === ctx.field?.name) {
        if (!errors[key]) errors[key] = issue.message
      }
    }
    return errors
  },
})
```

The validator decides its own trigger behavior. The engine always calls it with the context — the validator filters by `ctx.trigger` and `ctx.field`.

## Framework Integration

### Vue 3

#### Renderer

```ts
// vue-form.ts

import { h, reactive } from 'vue'
import type { VNode } from 'vue'
import { createFormEngine, collectDefaults } from '@jayobado/dsl-toolkit'
import type { Field, FieldBinding, FieldGroup, GroupBinding, Form } from '@jayobado/dsl-toolkit'

const engine = createFormEngine<VNode | null>({

  field: (field: Field, binding: FieldBinding): VNode | null => {
    if (binding.hidden) return null

    return h('div', { class: ['field', { 'field--error': !!binding.error }] }, [
      field.label
        ? h('label', { for: field.name }, field.label)
        : null,
      renderInput(field, binding),
      field.hint && !binding.error
        ? h('span', { class: 'field-hint' }, field.hint)
        : null,
      binding.error
        ? h('span', { class: 'field-error' }, binding.error)
        : null,
    ])
  },

  group: (group: FieldGroup, children: (VNode | null)[], binding: GroupBinding): VNode | null => {
    if (binding.hidden) return null

    return h('fieldset', { disabled: binding.disabled }, [
      group.label ? h('legend', group.label) : null,
      ...children,
    ])
  },

  form: (form: Form, children: (VNode | null)[]): VNode => {
    return h('div', { class: 'form' }, children)
  },

  repeater: (repeater: Repeater, rows: RepeaterRow<VNode | null>[], controls: RepeaterControls): VNode => {
    return h('div', { class: 'repeater' }, [
      repeater.label ? h('label', { class: 'repeater-label' }, repeater.label) : null,

      ...rows.map(row =>
        h('div', { class: 'repeater-row' }, [
          ...row.fields,
          row.remove
            ? h('button', {
                type: 'button',
                class: 'repeater-remove',
                onClick: row.remove,
              }, '×')
            : null,
        ])
      ),

      controls.addRow
        ? h('button', {
            type: 'button',
            class: 'repeater-add',
            onClick: controls.addRow,
          }, '+ Add')
        : null,
    ])
  },
})

function renderInput(field: Field, binding: FieldBinding): VNode {
  const { value, disabled, onChange, onBlur } = binding

  switch (field.type) {
    case 'select':
      return h('select', {
        value: value ?? '',
        disabled,
        onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
        onBlur,
      }, [
        h('option', { value: '' }, field.placeholder ?? 'Select...'),
        ...(field.options ?? []).map(opt =>
          h('option', { value: opt.value }, opt.label)
        ),
      ])

    case 'checkbox':
      return h('input', {
        type: 'checkbox',
        checked: !!value,
        disabled,
        onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
        onBlur,
      })

    case 'radio':
      return h('div', { class: 'radio-group' },
        (field.options ?? []).map(opt =>
          h('label', { class: 'radio-option' }, [
            h('input', {
              type: 'radio',
              name: field.name,
              value: opt.value,
              checked: value === opt.value,
              disabled,
              onChange: () => onChange(opt.value),
              onBlur,
            }),
            opt.label,
          ])
        )
      )

    case 'textarea':
      return h('textarea', {
        value: value ?? '',
        placeholder: field.placeholder,
        disabled,
        onInput: (e: Event) => onChange((e.target as HTMLTextAreaElement).value),
        onBlur,
      })

    case 'number':
      return h('input', {
        type: 'number',
        value: value ?? '',
        placeholder: field.placeholder,
        disabled,
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value
          onChange(v === '' ? undefined : Number(v))
        },
        onBlur,
      })

    default:
      return h('input', {
        type: field.type,
        value: value ?? '',
        placeholder: field.placeholder,
        disabled,
        onInput: (e: Event) => onChange((e.target as HTMLInputElement).value),
        onBlur,
      })
  }
}
```

#### Factory

The `form()` factory creates reactive state once and returns an object with a render function and a submit handle. External action buttons call `submit()` to trigger form submission.

```ts
import type { FormHandle } from '@jayobado/dsl-toolkit'

export function form(definition: Form, seed?: Record<string, unknown>) {
  const state = reactive({ ...collectDefaults(definition.items), ...seed })
  const errors = reactive<Record<string, string | undefined>>({})
  let handle: FormHandle | undefined

  return {
    render: () => engine.render(definition, {
      state,
      errors,
      onReady: (h) => { handle = h },
    }),
    submit: () => handle?.submit(),
    state,
    errors,
  }
}
```

#### Usage

```ts
import { defineComponent, h } from 'vue'
import { form } from './vue-form'

// Create mode — external submit button
export const LoginPage = defineComponent({
  setup() {
    const f = form(loginForm)

    return () => h('div', {}, [
      f.render(),
      h('button', { onClick: () => f.submit() }, 'Sign In'),
    ])
  },
})

// Edit mode — seed with existing data
export const EditUserPage = defineComponent({
  setup() {
    const existing = { email: 'jeremy@example.com', firstName: 'Jeremy' }
    const f = form(registerForm, existing)

    return () => h('div', {}, [
      f.render(),
      h('div', { class: 'form-actions' }, [
        h('button', { onClick: () => f.submit() }, 'Save'),
        h('button', { onClick: () => router.back() }, 'Cancel'),
      ]),
    ])
  },
})

// Inline definition
export default defineComponent({
  setup() {
    const f = form({
      type: 'form',
      onSubmit: (s) => console.log(s),
      items: [
        { name: 'name', type: 'text', label: 'Name', rules: { required: true } },
        { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
      ],
    })

    return () => h('div', {}, [
      f.render(),
      h('button', { onClick: () => f.submit() }, 'Submit'),
    ])
  },
})
```

### lolo-ui (Signals)

#### Renderer

```ts
// lolo-form.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import { createFormEngine, collectDefaults } from '@jayobado/dsl-toolkit'
import type { Field, FieldBinding, FieldGroup, GroupBinding, Form } from '@jayobado/dsl-toolkit'

const engine = createFormEngine<HTMLElement>({

  field: (field: Field, binding: FieldBinding): HTMLElement => {
    const wrapper = el('div', { class: 'field' })
    show(wrapper, () => !binding.hidden)

    if (field.label) {
      wrapper.append(el('label', {}, text(field.label)))
    }

    wrapper.append(renderInput(field, binding))

    if (field.hint) {
      wrapper.append(el('span', { class: 'field-hint' }, text(field.hint)))
    }

    const errorEl = el('span', { class: 'field-error' })
    show(errorEl, () => !!binding.error)
    text(errorEl, () => binding.error ?? '')
    wrapper.append(errorEl)

    return wrapper
  },

  group: (group: FieldGroup, children: HTMLElement[], binding: GroupBinding): HTMLElement => {
    const fieldset = el('fieldset')
    show(fieldset, () => !binding.hidden)
    attr(fieldset, 'disabled', () => binding.disabled)

    if (group.label) {
      fieldset.append(el('legend', {}, text(group.label)))
    }

    for (const child of children) {
      fieldset.append(child)
    }

    return fieldset
  },

  form: (form: Form, children: HTMLElement[]): HTMLElement => {
    const wrapper = el('div', { class: 'form' })

    for (const child of children) {
      wrapper.append(child)
    }

    return wrapper
  },

  repeater: (repeater: Repeater, rows: RepeaterRow<HTMLElement>[], controls: RepeaterControls): HTMLElement => {
    const wrapper = el('div', { class: 'repeater' })

    if (repeater.label) {
      const label = el('label', { class: 'repeater-label' })
      text(label, repeater.label)
      wrapper.append(label)
    }

    for (const row of rows) {
      const rowEl = el('div', { class: 'repeater-row' })
      for (const field of row.fields) {
        rowEl.append(field)
      }
      if (row.remove) {
        const removeBtn = el('button', { type: 'button', class: 'repeater-remove' })
        text(removeBtn, '×')
        on(removeBtn, 'click', row.remove)
        rowEl.append(removeBtn)
      }
      wrapper.append(rowEl)
    }

    if (controls.addRow) {
      const addBtn = el('button', { type: 'button', class: 'repeater-add' })
      text(addBtn, '+ Add')
      on(addBtn, 'click', controls.addRow)
      wrapper.append(addBtn)
    }

    return wrapper
  },
})

function renderInput(field: Field, binding: FieldBinding): HTMLElement {
  const { value, disabled, onChange, onBlur } = binding

  switch (field.type) {
    case 'select': {
      const select = el('select')
      attr(select, 'disabled', () => disabled)
      select.append(el('option', { value: '' }, text(field.placeholder ?? 'Select...')))
      for (const opt of field.options ?? []) {
        select.append(el('option', { value: String(opt.value) }, text(opt.label)))
      }
      attr(select, 'value', () => String(value ?? ''))
      on(select, 'change', (e: Event) => onChange((e.target as HTMLSelectElement).value))
      on(select, 'blur', () => onBlur())
      return select
    }

    case 'checkbox': {
      const input = el('input', { type: 'checkbox' }) as HTMLInputElement
      attr(input, 'disabled', () => disabled)
      attr(input, 'checked', () => !!value)
      on(input, 'change', (e: Event) => onChange((e.target as HTMLInputElement).checked))
      on(input, 'blur', () => onBlur())
      return input
    }

    case 'textarea': {
      const textarea = el('textarea')
      if (field.placeholder) attr(textarea, 'placeholder', field.placeholder)
      attr(textarea, 'disabled', () => disabled)
      attr(textarea, 'value', () => String(value ?? ''))
      on(textarea, 'input', (e: Event) => onChange((e.target as HTMLTextAreaElement).value))
      on(textarea, 'blur', () => onBlur())
      return textarea
    }

    case 'number': {
      const input = el('input', { type: 'number' }) as HTMLInputElement
      if (field.placeholder) attr(input, 'placeholder', field.placeholder)
      attr(input, 'disabled', () => disabled)
      attr(input, 'value', () => String(value ?? ''))
      on(input, 'input', (e: Event) => {
        const v = (e.target as HTMLInputElement).value
        onChange(v === '' ? undefined : Number(v))
      })
      on(input, 'blur', () => onBlur())
      return input
    }

    default: {
      const input = el('input', { type: field.type }) as HTMLInputElement
      if (field.placeholder) attr(input, 'placeholder', field.placeholder)
      attr(input, 'disabled', () => disabled)
      attr(input, 'value', () => String(value ?? ''))
      on(input, 'input', (e: Event) => onChange((e.target as HTMLInputElement).value))
      on(input, 'blur', () => onBlur())
      return input
    }
  }
}
```

#### Usage

```ts
import { mount, el, text, on, reactiveObject } from '@jayobado/lolo-ui'
import { engine } from './lolo-form'
import type { FormHandle } from '@jayobado/dsl-toolkit'
import { loginForm } from './forms/login'

// Create mode — external submit button
let handle: FormHandle | undefined

const app = engine.render(loginForm, {
  reactive: reactiveObject,
  onReady: (h) => { handle = h },
})

const submitBtn = el('button', { type: 'button' })
text(submitBtn, 'Sign In')
on(submitBtn, 'click', () => handle?.submit())

const page = el('div')
page.append(app)
page.append(submitBtn)
mount('#app', page)

// Edit mode
const app = engine.render(loginForm, {
  reactive: reactiveObject,
  state: reactiveObject({ email: 'jeremy@example.com' }),
  onReady: (h) => { handle = h },
})
```

## Examples

### Login Form

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const loginForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: state.email, password: state.password }),
    })
  },
  items: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      hint: 'We will never share your email',
      rules: {
        required: true,
        pattern: { value: '.+@.+\\..+', message: 'Enter a valid email' },
      },
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      rules: {
        required: true,
        minLength: { value: 8, message: 'At least 8 characters' },
      },
    },
    {
      name: 'remember',
      type: 'checkbox',
      label: 'Remember me',
      default: false,
    },
  ],
}
```

### Registration with Groups and Toggle

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const registerForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/register', { method: 'POST', body: JSON.stringify(state) })
  },
  items: [
    {
      group: 'account',
      label: 'Account',
      items: [
        {
          name: 'email',
          type: 'email',
          label: 'Email',
          rules: {
            required: true,
            pattern: { value: '.+@.+\\..+', message: 'Enter a valid email' },
          },
        },
        {
          name: 'password',
          type: 'password',
          label: 'Password',
          rules: {
            required: true,
            minLength: { value: 8, message: 'At least 8 characters' },
            pattern: { value: '[A-Z]', message: 'Needs an uppercase letter' },
          },
        },
        {
          name: 'confirmPassword',
          type: 'password',
          label: 'Confirm Password',
          rules: {
            required: true,
            match: { value: 'password', message: 'Passwords do not match' },
          },
        },
      ],
    },
    {
      group: 'profile',
      label: 'Profile',
      items: [
        { name: 'firstName', type: 'text', label: 'First Name', rules: { required: true } },
        { name: 'lastName', type: 'text', label: 'Last Name', rules: { required: true } },
        {
          name: 'role',
          type: 'select',
          label: 'Role',
          rules: { required: true },
          options: [
            { label: 'Developer', value: 'developer' },
            { label: 'Designer', value: 'designer' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'roleOther',
          type: 'text',
          label: 'Specify role',
          rules: { required: true },
          toggle: (s) => s.role === 'other' ? undefined : 'hide',
        },
      ],
    },
    {
      group: 'company',
      label: 'Company Details',
      toggle: (s) => s.role === 'developer' || s.role === 'designer' ? undefined : 'hide',
      items: [
        { name: 'company', type: 'text', label: 'Company Name' },
        {
          name: 'companySize',
          type: 'select',
          label: 'Company Size',
          options: [
            { label: '1-10', value: 'small' },
            { label: '11-50', value: 'medium' },
            { label: '50+', value: 'large' },
          ],
        },
      ],
    },
  ],
}
```

### Settings with Disable Cascade

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const settingsForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/settings', { method: 'PUT', body: JSON.stringify(state) })
  },
  items: [
    {
      group: 'profile',
      label: 'Profile',
      items: [
        { name: 'displayName', type: 'text', label: 'Display Name', rules: { required: true } },
        { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
        { name: 'bio', type: 'textarea', label: 'Bio', placeholder: 'A few words about yourself' },
      ],
    },
    {
      group: 'notifications',
      label: 'Notifications',
      items: [
        {
          name: 'notificationsEnabled',
          type: 'checkbox',
          label: 'Enable notifications',
          default: true,
        },
        {
          group: 'notification-channels',
          label: 'Channels',
          toggle: (s) => s.notificationsEnabled ? undefined : 'disable',
          items: [
            { name: 'notifyEmail', type: 'checkbox', label: 'Email', default: true },
            { name: 'notifyPush', type: 'checkbox', label: 'Push', default: false },
            { name: 'notifySMS', type: 'checkbox', label: 'SMS', default: false },
            {
              name: 'smsPhone',
              type: 'text',
              label: 'Phone number for SMS',
              toggle: (s) => s.notifySMS ? undefined : 'hide',
              rules: { required: true },
            },
          ],
        },
      ],
    },
    {
      group: 'security',
      label: 'Security',
      items: [
        {
          name: 'twoFactor',
          type: 'checkbox',
          label: 'Enable two-factor authentication',
          default: false,
        },
        {
          name: 'twoFactorPhone',
          type: 'text',
          label: 'Phone for verification codes',
          toggle: (s) => s.twoFactor ? undefined : 'hide',
          rules: { required: true },
        },
      ],
    },
  ],
}
```

### Dynamic Form from Schema

Forms are data — build them at runtime from an API response.

```ts
import type { Form, Field, Item } from '@jayobado/dsl-toolkit'

interface FieldSchema {
  key: string
  label: string
  type: string
  required?: boolean
  options?: { label: string; value: string }[]
  dependsOn?: { field: string; value: unknown }
}

function schemaToForm(
  fields: FieldSchema[],
  onSubmit: (state: Record<string, unknown>) => void
): Form {
  const items: Item[] = fields.map((f): Field => {
    const field: Field = {
      name: f.key,
      type: f.type,
      label: f.label,
    }

    if (f.options) field.options = f.options
    if (f.required) field.rules = { required: true }
    if (f.dependsOn) {
      const dep = f.dependsOn
      field.toggle = (s) => s[dep.field] === dep.value ? undefined : 'hide'
    }

    return field
  })

  return { type: 'form', items, onSubmit }
}

// Usage
const form = schemaToForm(
  [
    { key: 'category', label: 'Category', type: 'select', required: true,
      options: [
        { label: 'Bug', value: 'bug' },
        { label: 'Feature', value: 'feature' },
      ]},
    { key: 'severity', label: 'Severity', type: 'select', required: true,
      dependsOn: { field: 'category', value: 'bug' },
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'Low', value: 'low' },
      ]},
    { key: 'description', label: 'Description', type: 'textarea', required: true },
  ],
  async (state) => {
    await fetch('/api/tickets', { method: 'POST', body: JSON.stringify(state) })
  }
)
```

### Composable Fragments

Reuse field groups across forms with plain functions.

```ts
import type { Form, Item, FieldGroup } from '@jayobado/dsl-toolkit'

const nameFields = (prefix = ''): Item[] => [
  { name: `${prefix}firstName`, type: 'text', label: 'First Name', rules: { required: true } },
  { name: `${prefix}lastName`, type: 'text', label: 'Last Name', rules: { required: true } },
]

const addressFields = (prefix = ''): Item[] => [
  { name: `${prefix}street`, type: 'text', label: 'Street', rules: { required: true } },
  { name: `${prefix}city`, type: 'text', label: 'City', rules: { required: true } },
  { name: `${prefix}zip`, type: 'text', label: 'ZIP', rules: { required: true } },
  {
    name: `${prefix}country`,
    type: 'select',
    label: 'Country',
    rules: { required: true },
    options: [
      { label: 'Kenya', value: 'KE' },
      { label: 'Uganda', value: 'UG' },
      { label: 'Tanzania', value: 'TZ' },
    ],
  },
]

function group(key: string, label: string, items: Item[]): FieldGroup {
  return { group: key, label, items }
}

// Compose
const checkoutForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: (state) => processCheckout(state),
  items: [
    group('personal', 'Personal Info', nameFields()),
    group('billing', 'Billing Address', addressFields('billing_')),
    {
      name: 'sameAsShipping',
      type: 'checkbox',
      label: 'Shipping same as billing',
      default: true,
    },
    {
      ...group('shipping', 'Shipping Address', addressFields('shipping_')),
      toggle: (s) => s.sameAsShipping ? 'hide' : undefined,
    },
  ],
}
```

### Contact Form with Repeaters

A form with multiple repeaters — addresses and contact people.

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const contactForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/contacts', { method: 'POST', body: JSON.stringify(state) })
  },
  items: [
    { name: 'companyName', type: 'text', label: 'Company Name', rules: { required: true } },
    {
      name: 'industry',
      type: 'select',
      label: 'Industry',
      options: [
        { label: 'Technology', value: 'tech' },
        { label: 'Finance', value: 'finance' },
        { label: 'Healthcare', value: 'healthcare' },
      ],
    },
    {
      repeater: 'addresses',
      label: 'Addresses',
      addable: true,
      removable: true,
      min: 1,
      max: 5,
      template: [
        {
          group: 'address-row-1',
          items: [
            {
              name: 'type',
              type: 'select',
              label: 'Type',
              options: [
                { label: 'Headquarters', value: 'headquarters' },
                { label: 'Branch', value: 'branch' },
                { label: 'Billing', value: 'billing' },
              ],
            },
            { name: 'street', type: 'text', label: 'Street', rules: { required: true } },
          ],
        },
        {
          group: 'address-row-2',
          items: [
            { name: 'city', type: 'text', label: 'City', rules: { required: true } },
            { name: 'zip', type: 'text', label: 'ZIP', rules: { required: true } },
            {
              name: 'country',
              type: 'select',
              label: 'Country',
              rules: { required: true },
              options: [
                { label: 'Kenya', value: 'KE' },
                { label: 'Uganda', value: 'UG' },
                { label: 'Tanzania', value: 'TZ' },
              ],
            },
          ],
        },
      ],
    },
    {
      repeater: 'contacts',
      label: 'Contact People',
      addable: true,
      removable: true,
      min: 1,
      template: [
        { name: 'name', type: 'text', label: 'Full Name', rules: { required: true } },
        { name: 'email', type: 'email', label: 'Email', rules: { required: true } },
        { name: 'phone', type: 'text', label: 'Phone' },
        { name: 'role', type: 'text', label: 'Role / Title' },
      ],
    },
  ],
}
```

### Invoice Line Items

A repeater for invoice line items with constrained add/remove.

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const invoiceForm: Form = {
  type: 'form',
  validateOn: 'blur',
  onSubmit: async (state) => {
    await fetch('/api/invoices', { method: 'POST', body: JSON.stringify(state) })
  },
  items: [
    { name: 'invoiceNumber', type: 'text', label: 'Invoice Number', rules: { required: true } },
    { name: 'customerName', type: 'text', label: 'Customer', rules: { required: true } },
    {
      repeater: 'lineItems',
      label: 'Line Items',
      addable: true,
      removable: true,
      min: 1,
      template: [
        { name: 'description', type: 'text', label: 'Description', rules: { required: true } },
        { name: 'quantity', type: 'number', label: 'Qty', default: 1, rules: { required: true, min: 1 } },
        { name: 'unitPrice', type: 'number', label: 'Unit Price', default: 0, rules: { required: true, min: 0 } },
      ],
    },
  ],
}
```

State on submit:

```ts
{
  invoiceNumber: 'INV-001',
  customerName: 'Acme Corp',
  lineItems: [
    { description: 'Widget A', quantity: 10, unitPrice: 250 },
    { description: 'Gadget B', quantity: 5, unitPrice: 890 },
  ],
}
```

### Conditional Repeater

A repeater that only shows when a checkbox is checked.

```ts
import type { Form } from '@jayobado/dsl-toolkit'

const orderForm: Form = {
  type: 'form',
  onSubmit: (state) => console.log(state),
  items: [
    { name: 'productName', type: 'text', label: 'Product', rules: { required: true } },
    { name: 'hasVariants', type: 'checkbox', label: 'This product has variants', default: false },
    {
      repeater: 'variants',
      label: 'Variants',
      addable: true,
      removable: true,
      min: 1,
      toggle: (s) => s.hasVariants ? undefined : 'hide',
      template: [
        { name: 'name', type: 'text', label: 'Variant Name', rules: { required: true } },
        { name: 'sku', type: 'text', label: 'SKU', rules: { required: true } },
        { name: 'price', type: 'number', label: 'Price', rules: { required: true, min: 0 } },
      ],
    },
  ],
}
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Field` | Form field — `name`, `type`, `label`, `rules`, `toggle`, `default`, etc. |
| `FieldGroup` | Groups items — `group`, `label`, `items`, `toggle` |
| `Repeater` | Dynamic list — `repeater`, `template`, `addable?`, `removable?`, `min?`, `max?`, `toggle?` |
| `Item` | `Field \| FieldGroup \| Repeater` |
| `Form` | Root — `items`, `onSubmit`, `validateOn` |
| `Option` | Select/radio choice — `label`, `value` |
| `FieldType` | `'text' \| 'number' \| 'select' \| ...` (extensible) |
| `ValidateOn` | `'change' \| 'blur' \| 'submit'` |
| `ValidationRules` | Declarative rules — `required`, `minLength`, `pattern`, `match`, `custom`, etc. |
| `RuleValue<T>` | `T \| { value: T; message: string }` |
| `FieldBinding` | Reactive getters + callbacks — `value`, `error`, `disabled`, `hidden`, `onChange`, `onBlur` |
| `GroupBinding` | Reactive getters — `disabled`, `hidden` |

### Engine

| Export | Description |
|--------|-------------|
| `createFormEngine<Element>(config)` | Factory — returns `{ render }` |
| `collectDefaults(items)` | Builds `{ name: default }` from field tree (includes repeater defaults) |
| `collectFields(items)` | Flattens tree to `Field[]` (excludes repeater template fields) |
| `collectRowDefaults(items)` | Builds row defaults from a repeater template |
| `FormConfig<Element>` | Config type — `field`, `group`, `form`, `repeater` handlers + optional `validate` |
| `FormOptions` | Options for `render()` — `state`, `errors`, `reactive`, `onReady` |
| `FormHandle` | Exposes `submit` via `onReady` callback |
| `ValidateContext` | Passed to external validators — `trigger`, `field?` |
| `FieldHandler<Element>` | `(field, binding) => Element` |
| `GroupHandler<Element>` | `(group, children, binding) => Element` |
| `FormHandler<Element>` | `(form, children) => Element` |
| `RepeaterHandler<Element>` | `(repeater, rows, controls) => Element` |
| `RepeaterRow<Element>` | `{ index, fields, remove? }` |
| `RepeaterControls` | `{ addRow?, canAdd, canRemove }` |