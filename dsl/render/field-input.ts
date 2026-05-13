import { effect } from '../../signals.ts'
import {
	div, label, input, select, option, textarea,
} from '../../dom.ts'
import type { InputProps } from '../../dom.ts'
import type { Field, FieldBinding } from '../form/mod.ts'
import { reactiveDisabled } from './reactive.ts'

export function renderFieldInput(field: Field, binding: FieldBinding): HTMLElement {
	switch (field.type) {
		case 'select': {
			const el = select({ name: field.name })
			reactiveDisabled(el, () => binding.disabled)

			el.append(option({ value: '' }, field.placeholder ?? 'Select...'))
			for (const opt of field.options ?? []) {
				el.append(option({ value: String(opt.value) }, opt.label))
			}

			effect(() => { (el as HTMLSelectElement).value = String(binding.value ?? '') })
			el.addEventListener('change', (e) => binding.onChange((e.target as HTMLSelectElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'checkbox': {
			const el = input({ type: 'checkbox', name: field.name })
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).checked = !!binding.value })
			el.addEventListener('change', (e) => binding.onChange((e.target as HTMLInputElement).checked))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'radio': {
			const group = div({ class: 'radio-group' })
			for (const opt of field.options ?? []) {
				const radioInput = input({
					type: 'radio',
					name: field.name,
					value: String(opt.value),
				})
				reactiveDisabled(radioInput, () => binding.disabled)
				effect(() => { (radioInput as HTMLInputElement).checked = binding.value === opt.value })
				radioInput.addEventListener('change', () => binding.onChange(opt.value))
				radioInput.addEventListener('blur', () => binding.onBlur())

				group.append(label(null, radioInput, opt.label))
			}
			return group
		}

		case 'textarea': {
			const props: Record<string, unknown> = { name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = textarea(props as any)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLTextAreaElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => binding.onChange((e.target as HTMLTextAreaElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'number': {
			const props: InputProps = { type: 'number', name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = input(props)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => {
				const v = (e.target as HTMLInputElement).value
				binding.onChange(v === '' ? undefined : Number(v))
			})
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		default: {
			const props: InputProps = { type: field.type, name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = input(props)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => binding.onChange((e.target as HTMLInputElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}
	}
}