# Examples

Real shapes drawn from real apps. Each example demonstrates a different
slice of lolo-ui — the signup form shows schema validation and async mutation,
the login form shows minimal forms with rule-based validation, the expense
entry shows number coercion and array nodes, the search box shows reactive
filtering.

These assume you've read [Concepts](concepts.md) and skimmed [The declarative
layer](declarative.md).

## Signup form

A standard signup flow: validate the input against a schema, post to an API,
handle errors. This is the most common form shape — full schema validation
on submit, async submission, feedback on failure.

```typescript
import { defineContainer, h } from '@jayobado/lolo-ui'
import { useMutation } from '@jayobado/lolo-ui/query'
import { defineForm, renderForm } from '@jayobado/lolo-ui/dsl'
import { toast } from '@jayobado/lolo-ui/primitives'
import { z } from 'zod'

// Your own API client — could be Connect, tRPC, hand-rolled fetch.
import { api } from './lib/api.ts'

const signupSchema = z.object({
	email:           z.string().email('Must be a valid email'),
	password:        z.string().min(8, 'At least 8 characters'),
	confirmPassword: z.string(),
}).refine(
	(data) => data.password === data.confirmPassword,
	{ message: 'Passwords must match', path: ['confirmPassword'] },
)

type SignupState = z.infer<typeof signupSchema>

export const signupContainer = defineContainer({
	route: { path: '/signup', title: 'Sign up' },

	setup() {
		const signup = useMutation((input: SignupState) => api.auth.signup(input))
		return { signup }
	},

	content: ({ signup }) => {
		const root = h('div', { class: 'auth-page' })

		root.append(h('h1', null, 'Create an account'))

		const form = renderForm(defineForm<SignupState>({
			type:    'form',
			initial: { email: '', password: '', confirmPassword: '' },
			schema:  signupSchema,
			onSubmit: async (state) => {
				try {
					await signup.mutate(state)
					toast.success('Welcome!')
					// Navigate to dashboard, etc.
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Signup failed')
				}
			},
			children: [
				{
					type:         'input',
					name:         'email',
					label:        'Email',
					inputType:    'email',
					autocomplete: 'email',
					required:     true,
				},
				{
					type:         'input',
					name:         'password',
					label:        'Password',
					inputType:    'password',
					autocomplete: 'new-password',
					required:     true,
				},
				{
					type:         'input',
					name:         'confirmPassword',
					label:        'Confirm password',
					inputType:    'password',
					autocomplete: 'new-password',
					required:     true,
				},
				{
					type:   'button',
					label:  'Create account',
					action: 'submit',
					class:  'btn btn-primary',
				},
			],
		}))

		root.append(form)
		return root
	},
})
```

A few things worth noting:

- **Schema cross-field validation.** Zod's `.refine()` is how you express
  "passwords must match." The error's `path: ['confirmPassword']` routes the
  failure to the confirm field's error display.
- **`autocomplete` values matter.** Setting `'new-password'` on both password
  fields tells the browser not to offer existing saved passwords. Setting
  `'email'` lets the browser autofill cleanly.
- **Try/catch around `mutate`.** `useMutation.mutate()` throws on failure
  (the rationale: errors are propagated, not swallowed). Wrap with
  try/catch where you want UI-level error handling.
- **Toasts are imperative.** They're a singleton — call `toast.success(...)`
  from anywhere in the app. No need to wire them up per container.

## Login form

A simpler shape — just two fields, rule-based validation without a schema. Use
this pattern when the validation is one-off and a full schema would be
overkill.

```typescript
import { defineContainer, h } from '@jayobado/lolo-ui'
import { useMutation } from '@jayobado/lolo-ui/query'
import { defineForm, renderForm, required } from '@jayobado/lolo-ui/dsl'
import { toast } from '@jayobado/lolo-ui/primitives'

import { api } from './lib/api.ts'

interface LoginState {
	email:    string
	password: string
}

export const loginContainer = defineContainer({
	route: { path: '/login', title: 'Log in' },

	setup() {
		const login = useMutation((input: LoginState) => api.auth.login(input))
		return { login }
	},

	content: ({ login }) => {
		const root = h('div', { class: 'auth-page' })

		root.append(h('h1', null, 'Log in'))

		const form = renderForm(defineForm<LoginState>({
			type:    'form',
			initial: { email: '', password: '' },
			validateOn: 'blur',
			onSubmit: async (state) => {
				try {
					await login.mutate(state)
					// Navigate to dashboard, etc.
				} catch {
					toast.error('Invalid email or password')
				}
			},
			children: [
				{
					type:         'input',
					name:         'email',
					label:        'Email',
					inputType:    'email',
					autocomplete: 'email',
					rules:        [required('Email is required')],
				},
				{
					type:         'input',
					name:         'password',
					label:        'Password',
					inputType:    'password',
					autocomplete: 'current-password',
					rules:        [required('Password is required')],
				},
				{
					type:   'button',
					label:  'Log in',
					action: 'submit',
					class:  'btn btn-primary',
				},
			],
		}))

		root.append(form)
		return root
	},
})
```

Differences from signup:

- **No schema.** Field-level `rules` arrays handle validation. For a
  two-field form with one rule each, this reads cleaner than setting up
  a full schema.
- **`validateOn: 'blur'`.** Show validation feedback as the user moves between
  fields, not on every keystroke. Good for fields where you want immediate
  feedback but not as the user is mid-typing.
- **`autocomplete: 'current-password'`.** Tells the browser to offer saved
  credentials, distinct from `'new-password'` on signup.
- **The error toast is generic.** Login failures are usually "invalid
  credentials" — don't surface the API's error message to avoid leaking
  whether an email exists.

## Expense entry

A multi-section form: a header with vendor and date, plus a tabular section
for line items (split across categories). Demonstrates the array node, number
coercion, and a small schema.

```typescript
import { defineContainer, h } from '@jayobado/lolo-ui'
import { useMutation } from '@jayobado/lolo-ui/query'
import { defineForm, renderForm } from '@jayobado/lolo-ui/dsl'
import { toast } from '@jayobado/lolo-ui/primitives'
import { z } from 'zod'

import { api } from './lib/api.ts'

const expenseLineSchema = z.object({
	id:       z.string(),
	category: z.string().min(1, 'Category required'),
	amount:   z.number().positive('Must be positive'),
	note:     z.string(),
})

const expenseSchema = z.object({
	vendor: z.string().min(1, 'Vendor required'),
	date:   z.string().min(1, 'Date required'),
	lines:  z.array(expenseLineSchema).min(1, 'At least one line'),
})

type ExpenseState = z.infer<typeof expenseSchema>
type ExpenseLine  = z.infer<typeof expenseLineSchema>

const CATEGORIES = [
	{ value: 'travel',     label: 'Travel' },
	{ value: 'meals',      label: 'Meals' },
	{ value: 'supplies',   label: 'Supplies' },
	{ value: 'software',   label: 'Software' },
	{ value: 'other',      label: 'Other' },
]

export const expenseEntryContainer = defineContainer({
	route: { path: '/expenses/new', title: 'New expense' },

	setup() {
		const createExpense = useMutation(
			(input: ExpenseState) => api.expenses.create(input),
		)
		return { createExpense }
	},

	content: ({ createExpense }) => {
		const root = h('div', { class: 'page' })

		root.append(h('h1', null, 'New expense'))

		const form = renderForm(defineForm<ExpenseState>({
			type:    'form',
			initial: {
				vendor: '',
				date:   '',
				lines:  [],
			},
			schema:  expenseSchema,
			onSubmit: async (state) => {
				try {
					await createExpense.mutate(state)
					toast.success('Expense submitted')
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Submission failed')
				}
			},
			children: [
				{
					type:  'input',
					name:  'vendor',
					label: 'Vendor',
					required: true,
				},
				{
					type:      'input',
					name:      'date',
					label:     'Date',
					inputType: 'date',
					required:  true,
				},
				{
					type:        'array',
					name:        'lines',
					rowKey:      (line: ExpenseLine) => line.id,
					allowAdd:    true,
					allowRemove: true,
					addLabel:    'Add line',
					newRow:      () => ({
						id:       crypto.randomUUID(),
						category: '',
						amount:   0,
						note:     '',
					}),
					columns: [
						{
							header: 'Category',
							field:  {
								type:    'select',
								name:    'category',
								options: CATEGORIES,
							},
						},
						{
							header: 'Amount',
							field:  {
								type:      'input',
								name:      'amount',
								inputType: 'number',
							},
						},
						{
							header: 'Note',
							field:  {
								type: 'input',
								name: 'note',
							},
						},
					],
				},
				{
					type:   'button',
					label:  'Submit',
					action: 'submit',
					class:  'btn btn-primary',
				},
			],
		}))

		root.append(form)
		return root
	},
})
```

Worth knowing:

- **Number coercion in array rows.** The `amount` field has `inputType:
  'number'`. The engine coerces input values to `number` on write, so the
  state's `lines[i].amount` is a real number that the schema validates with
  `z.number().positive()`. Empty input produces `null`.
- **Schema validates the array.** `lines: z.array(expenseLineSchema).min(1)`
  ensures at least one line, and each line is fully validated. Errors at
  paths like `['lines', 2, 'amount']` map to the right row's right cell.
- **`crypto.randomUUID()` for row IDs.** The `rowKey` extractor needs stable
  identity across renders. Generating an ID at row creation gives you that.
- **The "category" select has no `placeholder`.** That's intentional in
  array rows — the placeholder would show as the initial value, which can
  conflict with the empty-string default. If you want a placeholder option,
  add it explicitly to `options`.

## Search box

A different shape entirely. Not a form-with-submit — a reactive input that
filters a list as the user types. Built with signals and `useQuery`. Shown
as a reusable widget (a function returning DOM) rather than a full
container.

```typescript
import { h, signal } from '@jayobado/lolo-ui'
import { useQuery } from '@jayobado/lolo-ui/query'
import { debounce } from '@jayobado/lolo-ui/primitives'

import { api } from './lib/api.ts'

interface User {
	id:    string
	name:  string
	email: string
}

export function userSearch(): HTMLElement {
	const query = signal('')

	// Debounce the actual fetch so we're not hammering the API.
	const debouncedQuery = signal('')
	const updateDebounced = debounce(() => debouncedQuery.set(query.get()), 300)

	const results = useQuery(() => {
		const q = debouncedQuery.get()
		if (q.length < 2) return Promise.resolve([])
		return api.users.search({ query: q })
	})

	const root = h('div', { class: 'search' })

	// The input
	const input = h('input', {
		type:        'search',
		placeholder: 'Search users...',
		class:       'search-input',
		onInput: (e) => {
			query.set((e.target as HTMLInputElement).value)
			updateDebounced()
		},
	})

	// The results list
	const list = h('ul', { class: 'search-results' })

	// Render results reactively
	const scope = getScope()!
	scope.effect(() => {
		const loading = results.loading.get()
		const data    = results.data.get()
		const error   = results.error.get()

		list.replaceChildren()

		if (loading && !data) {
			list.append(h('li', { class: 'search-loading' }, 'Searching...'))
			return
		}

		if (error) {
			list.append(h('li', { class: 'search-error' }, `Error: ${error.message}`))
			return
		}

		if (!data || data.length === 0) {
			if (query.get().length >= 2) {
				list.append(h('li', { class: 'search-empty' }, 'No results'))
			}
			return
		}

		for (const user of data) {
			const item = h('li', { class: 'search-result' }, [
				h('strong', null, user.name),
				h('span',   { class: 'search-result-email' }, user.email),
			])
			list.append(item)
		}
	})

	root.append(input, list)
	return root
}
```

This widget is used by appending it into a container's content:

```typescript
content: () => {
	const root = h('div', { class: 'page' })
	root.append(h('h1', null, 'Users'))
	root.append(userSearch())
	return root
}
```

Notes:

- **Two signals.** One for the immediate input value, one for the debounced
  version that drives the actual fetch. The user sees instant input
  responsiveness; the network only fires when they pause.
- **`useQuery` re-fires reactively.** The callback reads `debouncedQuery.get()`,
  so whenever that changes, the query re-runs. No manual refetch logic needed.
- **The `length < 2` guard.** Don't fire the API on every keystroke; require
  at least two characters. Returning a resolved promise with an empty array
  keeps the type clean.
- **Direct DOM manipulation in the effect.** The widget uses
  `list.replaceChildren()` to update results. Real DOM, no virtual DOM. For
  short lists this is fine; for very large result sets, you'd want keyed
  reconciliation — but `useQuery`-driven lists in dashboards are usually
  under 50 items.
- **`getScope()!` for the effect.** The widget assumes it's used inside a
  container's content function, where the ambient scope is set. The
  non-null assertion is honest — if you call `userSearch()` outside a scope,
  the effect leaks. Document this contract.

## Where to go next

- **[Patterns](patterns.md)** — app-level patterns built on top of lolo-ui
  (dialogs, dropdown menus, nav menus, route-aware links).