export interface FormFieldProps {
	label: string
	name?: string
	error?: string
	required?: boolean
	class?: string
	labelClass?: string
	errorClass?: string
}

export function formField(
	props: FormFieldProps,
	...children: (HTMLElement | string)[]
): HTMLElement {
	const { label, name, error, required } = props

	const wrapper = document.createElement('div')
	if (props.class) wrapper.className = props.class

	const labelEl = document.createElement('label')
	if (name) labelEl.setAttribute('for', name)
	if (props.labelClass) labelEl.className = props.labelClass
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
		if (props.errorClass) errorEl.className = props.errorClass
		errorEl.textContent = error
		wrapper.appendChild(errorEl)
	}

	return wrapper
}