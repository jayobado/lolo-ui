export interface FormGroupProps {
	class?: string
	legend?: string
	legendClass?: string
}

export function formGroup(
	props: FormGroupProps,
	...children: (HTMLElement | string)[]
): HTMLElement {
	const fieldset = document.createElement('fieldset')
	if (props.class) fieldset.className = props.class

	if (props.legend) {
		const legendEl = document.createElement('legend')
		if (props.legendClass) legendEl.className = props.legendClass
		legendEl.textContent = props.legend
		fieldset.appendChild(legendEl)
	}

	for (const child of children) {
		if (typeof child === 'string') {
			fieldset.append(child)
		} else {
			fieldset.appendChild(child)
		}
	}

	return fieldset
}