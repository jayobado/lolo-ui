import type {
	FieldHandler,
	GroupHandler,
	FormHandler,
	FormHandle,
	RepeaterHandler,
	RepeaterRow,
	RepeaterControls,
	ValidateContext,
	ValidateOn,
	Form,
	Item,
	Field,
	FieldBinding,
	GroupBinding,
	Repeater,
} from './types.ts';
import { validateField } from '../validation.ts';

export interface FormConfig<Element> {
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

export interface FormOptions {
	state?: Record<string, unknown>
	errors?: Record<string, string | undefined>
	reactive?: <T extends Record<string, unknown>>(obj: T) => T
	onReady?: (handle: FormHandle) => void
}

export function collectRowDefaults(items: Item[]): Record<string, unknown> {
	const defaults: Record<string, unknown> = {}
	for (const item of items) {
		if ('name' in item) {
			if (item.default !== undefined) defaults[item.name] = item.default
		} else if ('group' in item) {
			Object.assign(defaults, collectRowDefaults(item.items))
		}
	}
	return defaults
}

export function collectDefaults(items: Item[]): Record<string, unknown> {
	const defaults: Record<string, unknown> = {}
	for (const item of items) {
		if ('name' in item) {
			if (item.default !== undefined) defaults[item.name] = item.default
		} else if ('repeater' in item) {
			defaults[item.repeater] = [{ ...collectRowDefaults(item.template) }]
		} else {
			Object.assign(defaults, collectDefaults(item.items))
		}
	}
	return defaults
}


function collectFields(items: Item[]): Field[] {
	const fields: Field[] = []
	for (const item of items) {
		if ('name' in item) {
			fields.push(item)
		} else if ('repeater' in item) {
			// Template fields collected separately — handled in submit validation
		} else {
			fields.push(...collectFields(item.items))
		}
	}
	return fields
}

function collectRepeaters(items: Item[]): Repeater[] {
	const repeaters: Repeater[] = []
	for (const item of items) {
		if ('repeater' in item) {
			repeaters.push(item)
		} else if ('group' in item) {
			repeaters.push(...collectRepeaters(item.items))
		}
	}
	return repeaters
}

export function createFormEngine<Element>(cfg: FormConfig<Element>) {
	const { field: fieldHandler, group: groupHandler, form: formHandler, repeater: repeaterHandler } = cfg;

	function validate(
		field: Field,
		state: Record<string, unknown>,
		trigger: ValidateOn,
		form: Form
	): Record<string, string | undefined> {
		if (cfg.validate) {
			return cfg.validate(state, { trigger, field }, form)
		}
		return { [field.name]: validateField(field, state[field.name], state) }
	}

	function validateOnSubmit(
		state: Record<string, unknown>,
		fields: Field[],
		form: Form
	): Record<string, string | undefined> {
		if (cfg.validate) {
			return cfg.validate(state, { trigger: 'submit' }, form)
		}
		const errors: Record<string, string | undefined> = {}
		
		for (const f of fields) {
			if (f.toggle?.(state) === 'hide') continue
			errors[f.name] = validateField(f, state[f.name], state)
		}

		const repeaters = collectRepeaters(form.items)
		for (const rep of repeaters) {
			if (rep.toggle?.(state) === 'hide') continue
			const rows = (state[rep.repeater] as Record<string, unknown>[]) ?? []
			const tmplFields = collectFields(rep.template)

			for (let i = 0; i < rows.length; i++) {
				for (const f of tmplFields) {
					if (f.toggle?.(rows[i]) === 'hide') continue
					errors[`${rep.repeater}.${i}.${f.name}`] = validateField(f, rows[i][f.name], rows[i])
				}
			}
		}

		return errors
	}

	function renderItems(
		items: Item[],
		state: Record<string, unknown>,
		errors: Record<string, string | undefined>,
		isParentDisabled: () => boolean,
		validateOn: ValidateOn,
		form: Form,
		errorPrefix?: string
	): Element[] {
		const elements: Element[] = []

		for (const item of items) {
			if ('name' in item) {
				const trigger = item.validateOn ?? validateOn
				const errorKey = errorPrefix ? `${errorPrefix}.${item.name}` : item.name

				const binding: FieldBinding = {
					get value() { return state[item.name] },
					get error() { return errors[errorKey] },
					get disabled() { return isParentDisabled() || item.toggle?.(state) === 'disable' },
					get hidden() { return item.toggle?.(state) === 'hide' },
					onChange: (value: unknown) => {
						state[item.name] = value
						if (trigger === 'change') {
							const result = validate(item, state, 'change', form)
							for (const [k, v] of Object.entries(result)) {
								errors[errorPrefix ? `${errorPrefix}.${k}` : k] = v
							}
						} else if (errors[errorKey]) {
							errors[errorKey] = undefined
						}
					},
					onBlur: () => {
						if (trigger === 'blur') {
							const result = validate(item, state, 'blur', form)
							for (const [k, v] of Object.entries(result)) {
								errors[errorPrefix ? `${errorPrefix}.${k}` : k] = v
							}
						}
					},
				}

				elements.push(fieldHandler(item, binding))

			} else if ('repeater' in item) {
				const toggle = item.toggle?.(state)
				if (toggle === 'hide') continue

				const disabled = isParentDisabled() || toggle === 'disable'
				const topState = state
				const rows = (topState[item.repeater] as Record<string, unknown>[]) ?? []

				const renderedRows: RepeaterRow<Element>[] = rows.map((row, rowIndex) => {
					const prefix = errorPrefix
						? `${errorPrefix}.${item.repeater}.${rowIndex}`
						: `${item.repeater}.${rowIndex}`

					const fields = renderItems(
						item.template,
						row,
						errors,
						() => disabled,
						validateOn,
						form,
						prefix
					)

					const canRemove = item.removable !== false && rows.length > (item.min ?? 0)
					const remove = canRemove
						? () => {
							rows.splice(rowIndex, 1)
							for (const key of Object.keys(errors)) {
								if (key.startsWith(prefix + '.')) {
									delete errors[key]
								}
							}
						}
						: undefined

					return { index: rowIndex, fields, remove }
				})

				const canAdd = item.addable !== false && rows.length < (item.max ?? Infinity)
				const controls: RepeaterControls = {
					addRow: canAdd
						? () => rows.push({ ...collectRowDefaults(item.template) })
						: undefined,
					canAdd,
					canRemove: item.removable !== false && rows.length > (item.min ?? 0),
				}

				elements.push(repeaterHandler(item, renderedRows, controls))

			} else {
				const isGroupDisabled = () => isParentDisabled() || item.toggle?.(state) === 'disable'

				const groupBinding: GroupBinding = {
					get disabled() { return isGroupDisabled() },
					get hidden() { return item.toggle?.(state) === 'hide' },
				}

				const children = renderItems(item.items, state, errors, isGroupDisabled, validateOn, form, errorPrefix)
				elements.push(groupHandler(item, children, groupBinding))
			}
		}

		return elements
	}

	function render(form: Form, options?: FormOptions): Element {
		const wrap = options?.reactive ?? (<T extends Record<string, unknown>>(obj: T) => obj)
		const state = options?.state ?? wrap({ ...collectDefaults(form.items) })
		const errors = options?.errors ?? wrap<Record<string, string | undefined>>({})
		const validateOn = form.validateOn ?? 'submit'

		const submit = () => {
			const allFields = collectFields(form.items)
			const result = validateOnSubmit(state, allFields, form)
			Object.assign(errors, result)

			const hasErrors = Object.values(result).some(e => !!e)
			if (!hasErrors) form.onSubmit(state)
		}

		const children = renderItems(form.items, state, errors, () => false, validateOn, form)
		if (options?.onReady) {
			options.onReady({ submit })
		}
		return formHandler(form, children);
	}

	return { render }

}