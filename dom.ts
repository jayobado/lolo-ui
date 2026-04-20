type Child = Node | string | number | null | undefined | false

export interface ElementProps {
	class?: string
	id?: string
	role?: string
	title?: string
	tabIndex?: number
	key?: string | number
	'aria-label'?: string
	'aria-hidden'?: string
	'aria-expanded'?: string
	'aria-live'?: string
	onClick?: (e: MouseEvent) => void
	onDblclick?: (e: MouseEvent) => void
	onMouseenter?: (e: MouseEvent) => void
	onMouseleave?: (e: MouseEvent) => void
	onFocus?: (e: FocusEvent) => void
	onBlur?: (e: FocusEvent) => void
	onKeydown?: (e: KeyboardEvent) => void
	onKeyup?: (e: KeyboardEvent) => void
	onInput?: (e: InputEvent) => void
	onChange?: (e: Event) => void
	onSubmit?: (e: SubmitEvent) => void
}

export interface InputProps extends ElementProps {
	type?: string
	name?: string
	value?: string
	placeholder?: string
	disabled?: boolean
	required?: boolean
	readonly?: boolean
	checked?: boolean
	min?: string
	max?: string
	step?: string
	autocomplete?: string
	autofocus?: boolean
}

export interface ButtonProps extends ElementProps {
	type?: 'button' | 'submit' | 'reset'
	disabled?: boolean
}

export interface AnchorProps extends ElementProps {
	href?: string
	target?: string
	rel?: string
}

export interface ImgProps extends ElementProps {
	src?: string
	alt?: string
	loading?: 'lazy' | 'eager'
	width?: number
	height?: number
}

export interface FormProps extends ElementProps {
	action?: string
	method?: string
	enctype?: string
}

export interface SelectProps extends ElementProps {
	name?: string
	value?: string
	disabled?: boolean
	required?: boolean
	multiple?: boolean
}

export interface OptionProps extends ElementProps {
	value?: string
	selected?: boolean
	disabled?: boolean
}

export interface TextareaProps extends ElementProps {
	name?: string
	value?: string
	placeholder?: string
	disabled?: boolean
	required?: boolean
	readonly?: boolean
	rows?: number
	cols?: number
}

export interface LabelProps extends ElementProps {
	for?: string
}

export interface ThProps extends ElementProps {
	scope?: string
	colSpan?: number
	rowSpan?: number
}

export interface TdProps extends ElementProps {
	colSpan?: number
	rowSpan?: number
}

type El = (p?: ElementProps | null, ...c: Child[]) => HTMLElement
type FormEl = (p?: FormProps | null, ...c: Child[]) => HTMLElement
type LabelEl = (p?: LabelProps | null, ...c: Child[]) => HTMLElement
type InputEl = (p?: InputProps | null) => HTMLElement
type ButtonEl = (p?: ButtonProps | null, ...c: Child[]) => HTMLElement
type SelectEl = (p?: SelectProps | null, ...c: Child[]) => HTMLElement
type OptionEl = (p?: OptionProps | null, ...c: Child[]) => HTMLElement
type TextareaEl = (p?: TextareaProps | null) => HTMLElement
type ImgEl = (p?: ImgProps | null) => HTMLElement
type AnchorEl = (p?: AnchorProps | null, ...c: Child[]) => HTMLElement
type ThEl = (p?: ThProps | null, ...c: Child[]) => HTMLElement
type TdEl = (p?: TdProps | null, ...c: Child[]) => HTMLElement
type VoidEl = () => HTMLElement

const eventMap: Record<string, string> = {
	onClick: 'click',
	onDblclick: 'dblclick',
	onMouseenter: 'mouseenter',
	onMouseleave: 'mouseleave',
	onFocus: 'focus',
	onBlur: 'blur',
	onKeydown: 'keydown',
	onKeyup: 'keyup',
	onInput: 'input',
	onChange: 'change',
	onSubmit: 'submit',
}

const booleanAttrs = new Set([
	'disabled', 'required', 'readonly', 'checked',
	'autofocus', 'multiple', 'selected',
])

const skipAttrs = new Set([
	'class', 'key',
	...Object.keys(eventMap),
])

function applyProps(el: HTMLElement, props: ElementProps): void {
	if (props.class) el.className = props.class

	for (const [key, value] of Object.entries(props)) {
		if (value == null || skipAttrs.has(key)) continue

		if (key in eventMap) {
			el.addEventListener(eventMap[key], value as EventListener)
			continue
		}

		if (booleanAttrs.has(key)) {
			if (value) el.setAttribute(key, '')
			continue
		}

		const attrName = key === 'tabIndex' ? 'tabindex'
			: key === 'colSpan' ? 'colspan'
				: key === 'rowSpan' ? 'rowspan'
					: key

		el.setAttribute(attrName, String(value))
	}
}

function normaliseChildren(children: Child[]): (Node | string)[] {
	return (children.flat(Infinity as 1) as Child[])
		.filter(c => c != null && c !== false)
		.map(c => c instanceof Node ? c : String(c)) as (Node | string)[]
}

function el<P extends ElementProps>(
	tag: string,
	props: P | null | undefined,
	...children: Child[]
): HTMLElement {
	const element = document.createElement(tag)
	if (props) applyProps(element, props)
	normaliseChildren(children).forEach(child => element.append(child))
	return element
}

// Layout
export const div: El = (p?, ...c) => el('div', p, ...c)
export const section: El = (p?, ...c) => el('section', p, ...c)
export const article: El = (p?, ...c) => el('article', p, ...c)
export const aside: El = (p?, ...c) => el('aside', p, ...c)
export const header: El = (p?, ...c) => el('header', p, ...c)
export const footer: El = (p?, ...c) => el('footer', p, ...c)
export const main: El = (p?, ...c) => el('main', p, ...c)
export const nav: El = (p?, ...c) => el('nav', p, ...c)

// Text
export const span: El = (p?, ...c) => el('span', p, ...c)
export const p: El = (p?, ...c) => el('p', p, ...c)
export const h1: El = (p?, ...c) => el('h1', p, ...c)
export const h2: El = (p?, ...c) => el('h2', p, ...c)
export const h3: El = (p?, ...c) => el('h3', p, ...c)
export const h4: El = (p?, ...c) => el('h4', p, ...c)
export const h5: El = (p?, ...c) => el('h5', p, ...c)
export const h6: El = (p?, ...c) => el('h6', p, ...c)
export const strong: El = (p?, ...c) => el('strong', p, ...c)
export const em: El = (p?, ...c) => el('em', p, ...c)
export const small: El = (p?, ...c) => el('small', p, ...c)
export const code: El = (p?, ...c) => el('code', p, ...c)
export const pre: El = (p?, ...c) => el('pre', p, ...c)

// Lists
export const ul: El = (p?, ...c) => el('ul', p, ...c)
export const ol: El = (p?, ...c) => el('ol', p, ...c)
export const li: El = (p?, ...c) => el('li', p, ...c)

// Form
export const form: FormEl = (p?, ...c) => el('form', p, ...c)
export const label: LabelEl = (p?, ...c) => el('label', p, ...c)
export const input: InputEl = (p?) => el('input', p)
export const button: ButtonEl = (p?, ...c) => el('button', p, ...c)
export const select: SelectEl = (p?, ...c) => el('select', p, ...c)
export const option: OptionEl = (p?, ...c) => el('option', p, ...c)
export const textarea: TextareaEl = (p?) => el('textarea', p)
export const fieldset: El = (p?, ...c) => el('fieldset', p, ...c)

// Media / navigation
export const img: ImgEl = (p?) => el('img', p)
export const a: AnchorEl = (p?, ...c) => el('a', p, ...c)
export const hr: El = (p?) => el('hr', p)
export const br: VoidEl = () => el('br', null)

// Table
export const table: El = (p?, ...c) => el('table', p, ...c)
export const thead: El = (p?, ...c) => el('thead', p, ...c)
export const tbody: El = (p?, ...c) => el('tbody', p, ...c)
export const tfoot: El = (p?, ...c) => el('tfoot', p, ...c)
export const tr: El = (p?, ...c) => el('tr', p, ...c)
export const th: ThEl = (p?, ...c) => el('th', p, ...c)
export const td: TdEl = (p?, ...c) => el('td', p, ...c)

export type ComponentFn<P extends Record<string, unknown> = Record<string, unknown>> =
	(props: P) => HTMLElement

export function h<P extends Record<string, unknown>>(
	component: ComponentFn<P>,
	props: P
): HTMLElement {
	return component(props)
}