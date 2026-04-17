import { css } from '../css.ts'
import type { StyleObject } from '../css.ts'

export interface FormGroupProps {
	class?: string
	styles?: StyleObject
	legend?: string
	legendStyles?: StyleObject
}

export function formGroup(
	props: FormGroupProps,
	...children: (HTMLElement | string)[]
): HTMLElement {
	const fieldset = document.createElement('fieldset')

	const classes: string[] = []
	if (props.class) classes.push(props.class)
	if (props.styles) classes.push(css(props.styles))
	if (classes.length) fieldset.className = classes.join(' ')

	if (props.legend) {
		const legendEl = document.createElement('legend')
		if (props.legendStyles) legendEl.className = css(props.legendStyles)
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