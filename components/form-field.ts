import { css } from '../css.ts'
import type { StyleObject } from '../css.ts'

export interface FormFieldProps {
	label: string
	name?: string
	error?: string
	required?: boolean
	class?: string
	styles?: StyleObject
	labelStyles?: StyleObject
	errorStyles?: StyleObject
}

export function formField(
	props: FormFieldProps,
	...children: (HTMLElement | string)[]
): HTMLElement {
	const { label, name, error, required } = props

	const wrapper = document.createElement('div')

	const classes: string[] = []
	if (props.class) classes.push(props.class)
	if (props.styles) classes.push(css(props.styles))
	if (classes.length) wrapper.className = classes.join(' ')

	const labelEl = document.createElement('label')
	if (name) labelEl.setAttribute('for', name)
	if (props.labelStyles) labelEl.className = css(props.labelStyles)
	labelEl.textContent = required ? `${label} *` : label
	wrapper.appendChild(labelEl)

	for (const child of children) {
		if (typeof child === 'string') {
			wrapper.append(child)
		} else {
			wrapper.appendChild(child)
		}
	}

	if (error) {
		const errorEl = document.createElement('span')
		errorEl.setAttribute('role', 'alert')
		if (props.errorStyles) errorEl.className = css(props.errorStyles)
		errorEl.textContent = error
		wrapper.appendChild(errorEl)
	}

	return wrapper
}