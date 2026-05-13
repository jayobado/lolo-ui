# Table Node

The table node defines data tables as plain data — columns, display formatting, editable cells, row actions, and pagination. The table engine resolves cell values, manages editable cell state, and delegates rendering to handler functions you provide.

```ts
import type { Table } from '@jayobado/dsl-toolkit'

const employees: Table = {
  type: 'table',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    {
      key: 'status',
      label: 'Status',
      cell: (value) => ({
        type: 'badge',
        label: (value as string).charAt(0).toUpperCase() + (value as string).slice(1),
        variant: value === 'active' ? 'success' : 'error',
      }),
    },
    {
      key: 'salary',
      label: 'Salary',
      format: (v) => `KES ${(v as number).toLocaleString()}`,
    },
  ],
  actions: [
    { label: 'Edit', action: 'edit' },
    { label: 'Delete', action: 'delete' },
  ],
}
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Your Application                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Table    │  │ Handlers │  │ Row Data      │  │
│  │ Defs     │  │ (h, el)  │  │ + Options     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
│  ┌────▼──────────────▼───────────────▼────────┐  │
│  │            createTableEngine()             │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
├───────────────────────┼──────────────────────────┤
│       Library         │                          │
│  ┌────────────────────▼───────────────────────┐  │
│  │   Types + Engine + Shared Validation       │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Types

### Table

The root definition. Describes columns, optional row actions, and whether rows are selectable.

```ts
interface Table extends Node {
  type: 'table'
  columns: Column[]
  actions?: RowAction[]
  selectable?: boolean
}
```

The table definition is purely structural — it describes what columns exist and how cells render. Row data, pagination, editing behavior, and all callbacks live in render options.

### Column

A single column. Each column maps to a key in the row data.

```ts
interface Column {
  key: string
  label?: string
  sortable?: boolean
  filterable?: boolean
  format?: (value: unknown, row: Record<string, unknown>) => string
  cell?: (value: unknown, row: Record<string, unknown>) => CellDisplay
  field?: Field
}
```

A column renders its cell in one of four ways, determined by which properties are set:

`field` — the column is editable. The engine creates a `CellBinding` and the renderer draws an input. When `field` is present, `format` and `cell` are ignored. The field's `name` defaults to `column.key` — you don't need to repeat it.

`cell` — the column uses a rich display. The callback returns a `CellDisplay` object that the renderer interprets. Use this for badges, links, images, or any styled content.

`format` — the column uses a text transform. The callback returns a string. Use this for date formatting, currency, percentages.

Neither — the column displays the raw value as a string.

#### Why both `format` and `cell`?

Most columns just need text — a date formatted, a number with a currency prefix, a string capitalized. `format` handles this with a simple string return. No display vocabulary, no type system, just a function that returns text.

Some columns need more — a status badge with colors, a clickable link, an avatar image. `cell` returns a `CellDisplay` object that carries a `type` and arbitrary properties. The renderer's cell handler interprets these based on the project's display vocabulary.

The split keeps the common case simple while allowing full expressiveness when needed. A table with ten columns might have eight using `format` or raw display, and two using `cell` for badges. The definition stays clean.

```ts
columns: [
  // Raw — just show the value
  { key: 'name', label: 'Name' },

  // Formatted — text transform
  { key: 'salary', label: 'Salary', format: (v) => `KES ${(v as number).toLocaleString()}` },
  { key: 'startDate', label: 'Started', format: (v) => new Date(v as string).toLocaleDateString() },

  // Rich display — styled rendering
  {
    key: 'status',
    label: 'Status',
    cell: (value) => ({
      type: 'badge',
      label: value as string,
      variant: value === 'active' ? 'success' : 'error',
    }),
  },

  // Editable — input field
  { key: 'quantity', label: 'Qty', field: { type: 'number', default: 1, rules: { min: 1 } } },
]
```

### CellDisplay

A generic carrier for rich cell content. The library doesn't define what types exist — that's the renderer's vocabulary. Different renderers can support different cell display types.

```ts
interface CellDisplay {
  type: string
  label: string
  [key: string]: unknown
}
```

Common types a renderer might support:

```ts
// Badge
{ type: 'badge', label: 'Active', variant: 'success' }

// Link
{ type: 'link', label: 'View Profile', href: '/users/123' }

// Image
{ type: 'image', label: 'Avatar', src: '/avatars/alice.jpg' }
```

### RowAction

An action button rendered per row. The renderer draws it, the `onAction` callback in render options handles it.

```ts
interface RowAction {
  label: string
  action: string
  toggle?: (row: Record<string, unknown>) => 'hide' | 'disable' | undefined
}
```

`toggle` takes the row object — not application state. Whether an action shows depends on the row's data. For application-level checks (e.g., "only admins see Delete"), close over external state at definition time:

```ts
const isAdmin = currentUser.role === 'admin'

const table: Table = {
  type: 'table',
  columns: [...],
  actions: [
    { label: 'Edit', action: 'edit' },
    {
      label: 'Delete',
      action: 'delete',
      // Row-level: hide for protected rows
      toggle: (row) => row.protected ? 'hide' : undefined,
    },
    {
      label: 'Manage',
      action: 'manage',
      // App-level: only admins see this, via closure
      toggle: () => isAdmin ? undefined : 'hide',
    },
  ],
}
```

### Field (from form module)

Editable columns reuse the `Field` type from the form module. The column's `key` is used as the field's `name` — you don't need to specify `name` on the field.

```ts
// Just type, rules, options, default — no name needed
{ key: 'quantity', label: 'Qty', field: { type: 'number', default: 1, rules: { min: 1 } } }

// Select with options
{
  key: 'category',
  label: 'Category',
  field: {
    type: 'select',
    options: [
      { label: 'Widget', value: 'widget' },
      { label: 'Gadget', value: 'gadget' },
    ],
  },
}
```

See the [Form Node documentation](./form.md) for the full `Field` type reference including `ValidationRules`, `Option`, and `ValidateOn`.

## Engine

### CellBinding

The contract between the engine and the cell handler for editable cells. Same pattern as the form engine's `FieldBinding`.

```ts
interface CellBinding {
  readonly value: unknown
  readonly error: string | undefined
  readonly disabled: boolean
  onChange: (value: unknown) => void
  onBlur: () => void
}
```

All readable properties are getters — they read live from reactive row data on every access.

`value` — current cell value from the row object.

`error` — current validation error for this cell, or `undefined` if valid.

`disabled` — whether the cell is disabled. Currently always `false` — editable cells are always enabled. Reserved for future use.

`onChange` — call when the user changes the cell input. Writes to the row and runs validation.

`onBlur` — call when the cell input loses focus. Runs validation.

### CellValue

The resolved value the engine passes to the cell handler. A discriminated union — the handler switches on `mode`.

```ts
type CellValue =
  | { mode: 'raw'; value: unknown }
  | { mode: 'formatted'; text: string }
  | { mode: 'display'; display: CellDisplay }
  | { mode: 'editable'; field: Field; binding: CellBinding }
```

`raw` — no format or cell callback. The handler renders the raw value as text.

`formatted` — the column's `format` callback returned a string.

`display` — the column's `cell` callback returned a `CellDisplay` object.

`editable` — the column has a `field`. The handler renders an input using the field definition and cell binding.

### ResolvedAction

A row action with its toggle evaluated. Passed to the row handler as a ready-to-render object.

```ts
interface ResolvedAction {
  label: string
  action: string
  readonly hidden: boolean
  readonly disabled: boolean
  execute: () => void
}
```

`hidden` and `disabled` are getters — they re-evaluate the action's `toggle` against the current row data on every read. This keeps them reactive for signal-based frameworks.

`execute` calls `onAction` from render options with the action name and the row.

### TableControls

Passed to the table handler so it can render add-row buttons and pagination controls.

```ts
interface TableControls {
  addRow?: () => void
  pagination?: {
    total: number
    page: number
    pageSize: number
    onPageChange: (page: number) => void
  }
}
```

`addRow` is present when `addable` is set in render options. The table handler renders a button that calls it.

`pagination` is present when pagination is set in render options. The table handler renders page controls.

### Handler Signatures

```ts
type CellHandler<Element> = (column: Column, cell: CellValue, row: Record<string, unknown>) => Element
type RowHandler<Element> = (row: Record<string, unknown>, cells: Element[], actions: ResolvedAction[]) => Element
type TableHandler<Element> = (table: Table, rows: Element[], controls: TableControls) => Element
```

The cell handler renders one cell — it switches on `cell.mode` to decide what to draw. The row handler wraps pre-rendered cells and action buttons into a row. The table handler wraps everything — header, rows, add button, pagination.

### TableConfig

```ts
interface TableConfig<Element> {
  cell: CellHandler<Element>
  row: RowHandler<Element>
  table: TableHandler<Element>
  validate?: (value: unknown, field: Field, row: Record<string, unknown>) => string | undefined
}
```

Three handlers — one per structural level. One optional external validator for editable cells.

`validate` replaces built-in field validation when present. It receives the cell value, the field definition, and the full row. Return an error string or `undefined`.

### TableOptions

```ts
interface TableOptions {
  rows: Record<string, unknown>[]
  errors?: Record<string, string | undefined>[]
  pagination?: {
    total: number
    page: number
    pageSize: number
    onPageChange: (page: number) => void
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onFilter?: (key: string, value: unknown) => void
  onSelect?: (rows: Record<string, unknown>[]) => void
  onAction?: (action: string, row: Record<string, unknown>) => void
  addable?: boolean | (() => Record<string, unknown>)
  removable?: boolean | ((index: number, row: Record<string, unknown>) => boolean)
}
```

`rows` — the data. For read-only tables, a plain array. For editable tables, a reactive array.

`errors` — per-row validation errors for editable tables. An array of records, indexed by row. For read-only tables, omit.

`pagination` — present for paginated tables. The engine passes it through to `TableControls`.

`onSort` — called when a sortable column header is clicked. The renderer handles the UI; the caller handles re-sorting or re-fetching.

`onFilter` — called when a filterable column's filter changes.

`onSelect` — called when row selection changes. Receives the currently selected rows.

`onAction` — called when a row action is clicked. Receives the action name and the row.

`addable` — enables row addition. `true` derives defaults from editable column fields. A function provides the new row object.

`removable` — enables row removal. `true` removes immediately. A function acts as a guard — return `true` to confirm, `false` to cancel.

### createTableEngine

```ts
function createTableEngine<Element>(
  config: TableConfig<Element>
): { render: (table: Table, options: TableOptions) => Element }
```

Call once per renderer. Returns an object with a `render` method.

## Framework Integration

### Vue 3

#### Renderer

```ts
// vue-table.ts

import { h, reactive } from 'vue'
import type { VNode } from 'vue'
import { createTableEngine } from '@jayobado/dsl-toolkit'
import type { Column, Table, CellDisplay } from '@jayobado/dsl-toolkit'
import type { CellValue, ResolvedAction, TableControls, TableOptions } from '@jayobado/dsl-toolkit'

const engine = createTableEngine<VNode>({

  cell: (column, cell, row) => {
    switch (cell.mode) {
      case 'raw':
        return h('td', {}, String(cell.value ?? ''))

      case 'formatted':
        return h('td', {}, cell.text)

      case 'display':
        return h('td', {}, renderCellDisplay(cell.display))

      case 'editable':
        return h('td', { class: { 'cell--error': !!cell.binding.error } }, [
          renderCellInput(cell.field, cell.binding),
          cell.binding.error
            ? h('span', { class: 'cell-error' }, cell.binding.error)
            : null,
        ])
    }
  },

  row: (row, cells, actions) => {
    const actionButtons = actions
      .filter(a => !a.hidden)
      .map(a =>
        h('button', {
          type: 'button',
          disabled: a.disabled,
          onClick: a.execute,
        }, a.label)
      )

    return h('tr', {}, [
      ...cells,
      actionButtons.length > 0
        ? h('td', { class: 'actions' }, actionButtons)
        : null,
    ])
  },

  table: (table, rows, controls) => {
    const headers = table.columns.map(col =>
      h('th', {}, col.label ?? col.key)
    )

    if (table.actions?.length) {
      headers.push(h('th', {}, 'Actions'))
    }

    return h('div', { class: 'table-wrapper' }, [
      h('table', {}, [
        h('thead', {}, h('tr', {}, headers)),
        h('tbody', {}, rows),
      ]),

      controls.addRow
        ? h('button', {
            type: 'button',
            onClick: controls.addRow,
          }, '+ Add Row')
        : null,

      controls.pagination
        ? renderPagination(controls.pagination)
        : null,
    ])
  },
})

function renderCellDisplay(display: CellDisplay): VNode {
  switch (display.type) {
    case 'badge':
      return h('span', { class: `badge badge--${display.variant ?? 'neutral'}` }, display.label)
    case 'link':
      return h('a', { href: display.href as string }, display.label)
    default:
      return h('span', {}, display.label)
  }
}

function renderCellInput(field: { type: string; options?: { label: string; value: unknown }[] }, binding: { value: unknown; disabled: boolean; onChange: (v: unknown) => void; onBlur: () => void }): VNode {
  switch (field.type) {
    case 'select':
      return h('select', {
        value: binding.value ?? '',
        disabled: binding.disabled,
        onChange: (e: Event) => binding.onChange((e.target as HTMLSelectElement).value),
        onBlur: binding.onBlur,
      }, [
        h('option', { value: '' }, 'Select...'),
        ...(field.options ?? []).map(opt =>
          h('option', { value: opt.value }, opt.label)
        ),
      ])

    case 'checkbox':
      return h('input', {
        type: 'checkbox',
        checked: !!binding.value,
        disabled: binding.disabled,
        onChange: (e: Event) => binding.onChange((e.target as HTMLInputElement).checked),
        onBlur: binding.onBlur,
      })

    case 'number':
      return h('input', {
        type: 'number',
        value: binding.value ?? '',
        disabled: binding.disabled,
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value
          binding.onChange(v === '' ? undefined : Number(v))
        },
        onBlur: binding.onBlur,
      })

    default:
      return h('input', {
        type: field.type,
        value: binding.value ?? '',
        disabled: binding.disabled,
        onInput: (e: Event) => binding.onChange((e.target as HTMLInputElement).value),
        onBlur: binding.onBlur,
      })
  }
}

function renderPagination(p: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void }): VNode {
  const totalPages = Math.ceil(p.total / p.pageSize)
  return h('div', { class: 'pagination' }, [
    h('button', { disabled: p.page <= 1, onClick: () => p.onPageChange(p.page - 1) }, '← Previous'),
    h('span', {}, `Page ${p.page} of ${totalPages}`),
    h('button', { disabled: p.page >= totalPages, onClick: () => p.onPageChange(p.page + 1) }, 'Next →'),
  ])
}
```

#### Factory

```ts
export function table(
  definition: Table,
  rows: Record<string, unknown>[],
  options?: Partial<Omit<TableOptions, 'rows' | 'errors'>>
): () => VNode {
  const reactiveRows = reactive(rows)
  const errors = reactive([] as Record<string, string | undefined>[])

  return () => engine.render(definition, {
    ...options,
    rows: reactiveRows,
    errors,
  })
}
```

#### Usage

```ts
import { defineComponent } from 'vue'
import { table } from './vue-table'

// Read-only table
export const EmployeePage = defineComponent({
  setup() {
    const employees = [
      { name: 'Alice Kamau', department: 'Engineering', status: 'active', salary: 280000 },
      { name: 'Bob Odhiambo', department: 'Design', status: 'active', salary: 250000 },
    ]

    return table(employeeTable, employees, {
      onAction: (action, row) => {
        if (action === 'edit') openEditModal(row)
        if (action === 'delete') confirmDelete(row)
      },
    })
  },
})

// Editable table
export const InvoicePage = defineComponent({
  setup() {
    const lineItems = [
      { description: 'Widget A', quantity: 10, unitPrice: 250 },
    ]

    return table(invoiceTable, lineItems, {
      addable: true,
      removable: true,
    })
  },
})
```

### lolo-ui (Signals)

#### Renderer

```ts
// lolo-table.ts

import { el, text, show, attr, on } from '@jayobado/lolo-ui'
import { createTableEngine } from '@jayobado/dsl-toolkit'
import type { Column, Table, CellDisplay } from '@jayobado/dsl-toolkit'
import type { CellValue, ResolvedAction, TableControls, TableOptions } from '@jayobado/dsl-toolkit'

const engine = createTableEngine<HTMLElement>({

  cell: (column, cell, row) => {
    switch (cell.mode) {
      case 'raw': {
        const td = el('td')
        text(td, () => String(row[column.key] ?? ''))
        return td
      }

      case 'formatted': {
        const td = el('td')
        text(td, cell.text)
        return td
      }

      case 'display': {
        const td = el('td')
        td.append(renderCellDisplay(cell.display))
        return td
      }

      case 'editable': {
        const td = el('td')
        td.append(renderCellInput(cell.field, cell.binding))

        const errorEl = el('span', { class: 'cell-error' })
        show(errorEl, () => !!cell.binding.error)
        text(errorEl, () => cell.binding.error ?? '')
        td.append(errorEl)

        return td
      }
    }
  },

  row: (row, cells, actions) => {
    const tr = el('tr')

    for (const cell of cells) {
      tr.append(cell)
    }

    const actionTd = el('td', { class: 'actions' })
    for (const action of actions) {
      const btn = el('button', { type: 'button' })
      text(btn, action.label)
      show(btn, () => !action.hidden)
      attr(btn, 'disabled', () => action.disabled)
      on(btn, 'click', action.execute)
      actionTd.append(btn)
    }

    if (actions.length > 0) {
      tr.append(actionTd)
    }

    return tr
  },

  table: (table, rows, controls) => {
    const wrapper = el('div', { class: 'table-wrapper' })

    const tableEl = el('table')
    const thead = el('thead')
    const headerRow = el('tr')

    for (const col of table.columns) {
      const th = el('th')
      text(th, col.label ?? col.key)
      headerRow.append(th)
    }

    if (table.actions?.length) {
      const th = el('th')
      text(th, 'Actions')
      headerRow.append(th)
    }

    thead.append(headerRow)
    tableEl.append(thead)

    const tbody = el('tbody')
    for (const row of rows) {
      tbody.append(row)
    }
    tableEl.append(tbody)
    wrapper.append(tableEl)

    if (controls.addRow) {
      const addBtn = el('button', { type: 'button', class: 'add-row' })
      text(addBtn, '+ Add Row')
      on(addBtn, 'click', controls.addRow)
      wrapper.append(addBtn)
    }

    if (controls.pagination) {
      wrapper.append(renderPagination(controls.pagination))
    }

    return wrapper
  },
})

function renderCellDisplay(display: CellDisplay): HTMLElement {
  switch (display.type) {
    case 'badge': {
      const span = el('span', { class: `badge badge--${display.variant ?? 'neutral'}` })
      text(span, display.label)
      return span
    }
    case 'link': {
      const a = el('a', { href: display.href as string })
      text(a, display.label)
      return a
    }
    default: {
      const span = el('span')
      text(span, display.label)
      return span
    }
  }
}

function renderCellInput(
  field: { type: string; options?: { label: string; value: unknown }[] },
  binding: { value: unknown; disabled: boolean; onChange: (v: unknown) => void; onBlur: () => void }
): HTMLElement {
  switch (field.type) {
    case 'select': {
      const select = el('select')
      attr(select, 'disabled', () => binding.disabled)

      const emptyOpt = el('option', { value: '' })
      text(emptyOpt, 'Select...')
      select.append(emptyOpt)

      for (const opt of field.options ?? []) {
        const optEl = el('option', { value: String(opt.value) })
        text(optEl, opt.label)
        select.append(optEl)
      }

      attr(select, 'value', () => String(binding.value ?? ''))
      on(select, 'change', (e: Event) => binding.onChange((e.target as HTMLSelectElement).value))
      on(select, 'blur', () => binding.onBlur())
      return select
    }

    case 'checkbox': {
      const input = el('input', { type: 'checkbox' }) as HTMLInputElement
      attr(input, 'disabled', () => binding.disabled)
      attr(input, 'checked', () => !!binding.value)
      on(input, 'change', (e: Event) => binding.onChange((e.target as HTMLInputElement).checked))
      on(input, 'blur', () => binding.onBlur())
      return input
    }

    case 'number': {
      const input = el('input', { type: 'number' }) as HTMLInputElement
      attr(input, 'disabled', () => binding.disabled)
      attr(input, 'value', () => String(binding.value ?? ''))
      on(input, 'input', (e: Event) => {
        const v = (e.target as HTMLInputElement).value
        binding.onChange(v === '' ? undefined : Number(v))
      })
      on(input, 'blur', () => binding.onBlur())
      return input
    }

    default: {
      const input = el('input', { type: field.type }) as HTMLInputElement
      attr(input, 'disabled', () => binding.disabled)
      attr(input, 'value', () => String(binding.value ?? ''))
      on(input, 'input', (e: Event) => binding.onChange((e.target as HTMLInputElement).value))
      on(input, 'blur', () => binding.onBlur())
      return input
    }
  }
}

function renderPagination(p: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void }): HTMLElement {
  const totalPages = Math.ceil(p.total / p.pageSize)
  const wrapper = el('div', { class: 'pagination' })

  const prevBtn = el('button', { type: 'button' })
  text(prevBtn, '← Previous')
  attr(prevBtn, 'disabled', () => p.page <= 1)
  on(prevBtn, 'click', () => p.onPageChange(p.page - 1))
  wrapper.append(prevBtn)

  const pageText = el('span')
  text(pageText, () => `Page ${p.page} of ${totalPages}`)
  wrapper.append(pageText)

  const nextBtn = el('button', { type: 'button' })
  text(nextBtn, 'Next →')
  attr(nextBtn, 'disabled', () => p.page >= totalPages)
  on(nextBtn, 'click', () => p.onPageChange(p.page + 1))
  wrapper.append(nextBtn)

  return wrapper
}

export { engine }
```

#### Usage

```ts
import { mount, reactiveObject } from '@jayobado/lolo-ui'
import { engine } from './lolo-table'

// Read-only
const app = engine.render(employeeTable, {
  rows: employees,
  onAction: (action, row) => {
    if (action === 'edit') openEditModal(row)
    if (action === 'delete') confirmDelete(row)
  },
})
mount('#app', app)

// Editable with reactive rows
const rows = reactiveObject([
  { description: 'Widget A', quantity: 10, unitPrice: 250 },
])
const errors = reactiveObject([])

const app = engine.render(invoiceTable, {
  rows,
  errors,
  addable: true,
  removable: true,
})
mount('#app', app)
```

## Examples

### Read-Only Employee Directory

A table with raw values, formatted values, and rich cell displays.

```ts
import type { Table } from '@jayobado/dsl-toolkit'

const employeeTable: Table = {
  type: 'table',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    {
      key: 'status',
      label: 'Status',
      cell: (value) => ({
        type: 'badge',
        label: (value as string).charAt(0).toUpperCase() + (value as string).slice(1),
        variant: value === 'active' ? 'success' : 'error',
      }),
    },
    {
      key: 'salary',
      label: 'Salary',
      format: (v) => `KES ${(v as number).toLocaleString()}`,
    },
    {
      key: 'startDate',
      label: 'Started',
      format: (v) => new Date(v as string).toLocaleDateString(),
    },
  ],
  actions: [
    { label: 'Edit', action: 'edit' },
    {
      label: 'Delete',
      action: 'delete',
      toggle: (row) => row.protected ? 'hide' : undefined,
    },
  ],
}
```

### Editable Invoice Line Items

An editable table with computed columns, add/remove, and validation.

```ts
import type { Table } from '@jayobado/dsl-toolkit'

const invoiceTable: Table = {
  type: 'table',
  columns: [
    {
      key: 'description',
      label: 'Description',
      field: { type: 'text', rules: { required: true } },
    },
    {
      key: 'quantity',
      label: 'Qty',
      field: { type: 'number', default: 1, rules: { required: true, min: 1 } },
    },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      field: { type: 'number', default: 0, rules: { required: true, min: 0 } },
    },
    {
      key: 'total',
      label: 'Total',
      format: (_, row) => `KES ${((row.quantity as number) * (row.unitPrice as number)).toFixed(2)}`,
    },
  ],
}

// Mount with add/remove
table(invoiceTable, initialItems, {
  addable: true,
  removable: true,
})
```

### Mixed Display and Edit

A timesheet table where dates are display-only and hours/project are editable.

```ts
import type { Table } from '@jayobado/dsl-toolkit'

const timesheetTable: Table = {
  type: 'table',
  columns: [
    {
      key: 'date',
      label: 'Date',
      format: (v) => new Date(v as string).toLocaleDateString(),
    },
    {
      key: 'project',
      label: 'Project',
      field: {
        type: 'select',
        options: [
          { label: 'Phoenix API', value: 'phoenix' },
          { label: 'Atlas Dashboard', value: 'atlas' },
          { label: 'Internal Tools', value: 'internal' },
        ],
      },
    },
    {
      key: 'task',
      label: 'Task',
      field: { type: 'text', rules: { required: true } },
    },
    {
      key: 'hours',
      label: 'Hours',
      field: { type: 'number', default: 0, rules: { required: true, min: 0, max: 24 } },
    },
    {
      key: 'billable',
      label: 'Billable',
      field: { type: 'checkbox', default: true },
    },
  ],
}
```

### Conditional Row Actions

Actions that show or hide based on row data.

```ts
import type { Table } from '@jayobado/dsl-toolkit'

const taskTable: Table = {
  type: 'table',
  columns: [
    { key: 'title', label: 'Task' },
    { key: 'assignee', label: 'Assignee' },
    {
      key: 'priority',
      label: 'Priority',
      cell: (value) => ({
        type: 'badge',
        label: value as string,
        variant: value === 'high' ? 'error' : value === 'medium' ? 'warning' : 'neutral',
      }),
    },
    {
      key: 'status',
      label: 'Status',
      cell: (value) => ({
        type: 'badge',
        label: (value as string).replace(/-/g, ' '),
        variant: value === 'done' ? 'success' : value === 'in-progress' ? 'warning' : 'neutral',
      }),
    },
  ],
  actions: [
    {
      label: 'Advance →',
      action: 'advance',
      toggle: (row) => row.status === 'done' ? 'hide' : undefined,
    },
    {
      label: '← Move Back',
      action: 'regress',
      toggle: (row) => row.status === 'backlog' ? 'hide' : undefined,
    },
    { label: 'Edit', action: 'edit' },
    {
      label: 'Delete',
      action: 'delete',
      toggle: (row) => row.status === 'in-progress' ? 'disable' : undefined,
    },
  ],
}
```

### Paginated Server-Side Table

A read-only table with server-side pagination.

```ts
import { defineComponent, ref } from 'vue'
import { table } from './vue-table'

export const UserListPage = defineComponent({
  setup() {
    const users = ref<Record<string, unknown>[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = 20

    async function fetchPage(p: number) {
      const res = await fetch(`/api/users?page=${p}&size=${pageSize}`)
      const data = await res.json()
      users.value = data.items
      total.value = data.total
      page.value = p
    }

    fetchPage(1)

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
      ],
    }

    return table(userTable, users.value, {
      pagination: {
        total: total.value,
        page: page.value,
        pageSize,
        onPageChange: fetchPage,
      },
      onAction: (action, row) => {
        if (action === 'edit') router.push(`/users/${row.id}/edit`)
      },
    })
  },
})
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Table` | Root — `columns`, `actions?`, `selectable?` |
| `Column` | Column definition — `key`, `label?`, `sortable?`, `filterable?`, `format?`, `cell?`, `field?` |
| `CellDisplay` | Rich cell content — `type`, `label`, `[key: string]: unknown` |
| `RowAction` | Per-row action — `label`, `action`, `toggle?` |

### Engine

| Export | Description |
|--------|-------------|
| `createTableEngine<Element>(config)` | Factory — returns `{ render }` |
| `TableConfig<Element>` | Config — `cell`, `row`, `table` handlers + optional `validate` |
| `TableOptions` | Options for `render()` — `rows`, `errors?`, `pagination?`, `onAction?`, `addable?`, `removable?` |
| `CellBinding` | Reactive getters + callbacks for editable cells — `value`, `error`, `disabled`, `onChange`, `onBlur` |
| `CellValue` | Discriminated union — `raw`, `formatted`, `display`, `editable` |
| `ResolvedAction` | Resolved row action — `label`, `action`, `hidden`, `disabled`, `execute` |
| `TableControls` | Passed to table handler — `addRow?`, `pagination?` |
| `CellHandler<Element>` | `(column, cell, row) => Element` |
| `RowHandler<Element>` | `(row, cells, actions) => Element` |
| `TableHandler<Element>` | `(table, rows, controls) => Element` |