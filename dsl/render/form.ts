// --- dsl/render/form.ts ---

import { signal } from '../../signals.ts'
import { div, label, span, fieldset, button } from '../../dom.ts'
import type { Form } from '../form/mod.ts'
import { createFormEngine, collectDefaults } from '../form/mod.ts'
import type { RendererConfig, FormRenderOptions } from './types.ts'
import { reactiveDisplay, reactiveDisabled, reactiveText } from './reactive.ts'
import { renderFieldInput } from './field-input.ts'

export function createFormRenderer(overrides: RendererConfig) {
	const engine = createFormEngine<HTMLElement>({
		field: (field, binding) => {
			if (overrides.fields?.[field.type]) {
				return overrides.fields[field.type](field, binding)
			}

			const wrapper = div({ class: 'field' })
			reactiveDisplay(wrapper, () => !binding.hidden)

			if (field.label) {
				wrapper.append(label({ for: field.name }, field.label))
			}

			wrapper.append(renderFieldInput(field, binding))

			if (field.hint) {
				wrapper.append(span({ class: 'field-hint' }, field.hint))
			}

			const errorEl = span({ class: 'field-error' })
			reactiveDisplay(errorEl, () => !!binding.error)
			reactiveText(errorEl, () => binding.error ?? '')
			wrapper.append(errorEl)

			return wrapper
		},

		group: overrides.group ?? ((group, children, binding) => {
			const el = fieldset()
			reactiveDisplay(el, () => !binding.hidden)
			reactiveDisabled(el, () => binding.disabled)

			if (group.label) {
				const legend = document.createElement('legend')
				legend.textContent = group.label
				el.append(legend)
			}

			for (const child of children) el.append(child)
			return el
		}),

		form: overrides.form ?? ((_, children) => {
			const wrapper = div({ class: 'form' })
			for (const child of children) wrapper.append(child)
			return wrapper
		}),

		repeater: overrides.repeater ?? ((repeater, rows, controls) => {
			const wrapper = div({ class: 'repeater' })

			if (repeater.label) {
				wrapper.append(label({ class: 'repeater-label' }, repeater.label))
			}

			for (const row of rows) {
				const rowEl = div({ class: 'repeater-row' })
				for (const field of row.fields) rowEl.append(field)

				if (row.remove) {
					const removeBtn = button({ type: 'button', class: 'repeater-remove' }, '×')
					removeBtn.addEventListener('click', row.remove)
					rowEl.append(removeBtn)
				}

				wrapper.append(rowEl)
			}

			if (controls.addRow) {
				const addBtn = button({ type: 'button', class: 'repeater-add' }, '+ Add')
				addBtn.addEventListener('click', controls.addRow)
				wrapper.append(addBtn)
			}

			return wrapper
		}),
	})

	return function renderForm(form: Form, options?: FormRenderOptions): HTMLElement {
		const stateData = { ...collectDefaults(form.items), ...options?.state }
		const stateSignal = signal(stateData)
		const errorsSignal = signal<Record<string, string | undefined>>({})

		const stateProxy = new Proxy({} as Record<string, unknown>, {
			get: (_, key: string) => stateSignal.get()[key],
			set: (_, key: string, value: unknown) => {
				stateSignal.update(s => ({ ...s, [key]: value }))
				return true
			},
		})

		const errorsProxy = new Proxy({} as Record<string, string | undefined>, {
			get: (_, key: string) => errorsSignal.get()[key],
			set: (_, key: string, value: unknown) => {
				errorsSignal.update(e => ({ ...e, [key]: value as string | undefined }))
				return true
			},
		})

		return engine.render(form, {
			state: options?.state ?? stateProxy,
			errors: options?.errors ?? errorsProxy,
			onReady: options?.onReady,
		})
	}
}