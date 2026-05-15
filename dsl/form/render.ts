import { signal } from '../../core/signals.ts'
import type { Signal } from '../../core/signals.ts'
import { createScope, getScope, runInScope } from '../../core/scope.ts'
import type { Scope } from '../../core/scope.ts'
import type {
	Button,
	Checkbox,
	ClassValue,
	FormChild,
	FormController,
	Form,
	Input,
	Radio,
	Select,
	Textarea,
	ValidationRule
} from './types.ts'
import {
	validateWithRules,
	validateWithSchema,
	validateFieldWithRules,
	validateFieldWithSchema,
	type FieldRuleSet,
} from './validate.ts'

const scopeMap = new WeakMap<HTMLElement, Scope>()

function applyClass(el: HTMLElement, value: ClassValue): void {
	if (!value) return
	const cls = Array.isArray(value) ? value.join(' ') : value
	if (cls) el.className = cls
}

function isFieldNode(
	child: FormChild,
): child is Exclude<FormChild, Button> {
	return child.node !== 'button'
}

function resolveDisabled(
	disabled: boolean | ((state: Record<string, unknown>) => boolean) | undefined,
	state: Record<string, unknown>,
): boolean {
	if (typeof disabled === 'function') return disabled(state)
	return disabled === true
}
export function createFormController(): FormController {
	return {
		submit: () => { },
		reset: () => { },
	}
}

export function defineForm<TState extends Record<string, unknown>>(
	node: Form<TState>,
): Form<TState> {
	return node
}

interface FieldContext {
	state: Signal<Record<string, unknown>>
	errors: Signal<Record<string, string>>
	onBlur: (fieldName: string) => void
	onChange: (fieldName: string) => void
	scope: Scope
}

function buildInput(node: Input<Record<string, unknown>>, ctx: FieldContext): HTMLElement {
	const wrapper = document.createElement('label')
	applyClass(wrapper, node.class)

	if (node.label) {
		const labelText = document.createElement('span')
		labelText.textContent = node.label
		wrapper.appendChild(labelText)
	}

	const input = document.createElement('input')
	input.type = node.type ?? 'text'
	input.name = node.name
	if (node.placeholder) input.placeholder = node.placeholder
	if (node.autocomplete) input.autocomplete = node.autocomplete
	if (node.required) input.required = true
	applyClass(input, node.inputClass)

	input.value = String(ctx.state.get()[node.name] ?? '')

	input.addEventListener('input', () => {
		ctx.state.update((s) => ({ ...s, [node.name]: input.value }))
		ctx.onChange(node.name)
	})

	input.addEventListener('blur', () => ctx.onBlur(node.name))

	wrapper.appendChild(input)

	const errorSpan = document.createElement('span')
	applyClass(errorSpan, node.errorClass)
	wrapper.appendChild(errorSpan)

	ctx.scope.effect(() => {
		errorSpan.textContent = ctx.errors.get()[node.name] ?? ''
	})

	if (node.show) {
		ctx.scope.effect(() => {
			wrapper.style.display = node.show!(ctx.state.get()) ? '' : 'none'
		})
	}

	if (node.disabled !== undefined) {
		ctx.scope.effect(() => {
			input.disabled = resolveDisabled(node.disabled, ctx.state.get())
		})
	}

	return wrapper
}

function buildSelect(node: Select<Record<string, unknown>>, ctx: FieldContext): HTMLElement {
	const wrapper = document.createElement('label')
	applyClass(wrapper, node.class)

	if (node.label) {
		const labelText = document.createElement('span')
		labelText.textContent = node.label
		wrapper.appendChild(labelText)
	}

	const select = document.createElement('select')
	select.name = node.name
	if (node.required) select.required = true
	applyClass(select, node.inputClass)

	if (node.placeholder) {
		const opt = document.createElement('option')
		opt.value = ''
		opt.textContent = node.placeholder
		opt.disabled = true
		opt.selected = true
		select.appendChild(opt)
	}

	for (const o of node.options) {
		const opt = document.createElement('option')
		opt.value = o.value
		opt.textContent = o.label
		if (o.disabled) opt.disabled = true
		select.appendChild(opt)
	}

	select.value = String(ctx.state.get()[node.name] ?? '')

	select.addEventListener('change', () => {
		ctx.state.update((s) => ({ ...s, [node.name]: select.value }))
		ctx.onChange(node.name)
	})
	select.addEventListener('blur', () => ctx.onBlur(node.name))

	wrapper.appendChild(select)

	const errorSpan = document.createElement('span')
	applyClass(errorSpan, node.errorClass)
	wrapper.appendChild(errorSpan)

	ctx.scope.effect(() => {
		errorSpan.textContent = ctx.errors.get()[node.name] ?? ''
	})

	if (node.show) {
		ctx.scope.effect(() => {
			wrapper.style.display = node.show!(ctx.state.get()) ? '' : 'none'
		})
	}

	if (node.disabled !== undefined) {
		ctx.scope.effect(() => {
			select.disabled = resolveDisabled(node.disabled, ctx.state.get())
		})
	}

	return wrapper
}

function buildTextarea(node: Textarea<Record<string, unknown>>, ctx: FieldContext): HTMLElement {
	const wrapper = document.createElement('label')
	applyClass(wrapper, node.class)

	if (node.label) {
		const labelText = document.createElement('span')
		labelText.textContent = node.label
		wrapper.appendChild(labelText)
	}

	const textarea = document.createElement('textarea')
	textarea.name = node.name
	if (node.placeholder) textarea.placeholder = node.placeholder
	if (node.rows) textarea.rows = node.rows
	if (node.required) textarea.required = true
	applyClass(textarea, node.inputClass)

	textarea.value = String(ctx.state.get()[node.name] ?? '')

	textarea.addEventListener('input', () => {
		ctx.state.update((s) => ({ ...s, [node.name]: textarea.value }))
		ctx.onChange(node.name)
	})
	textarea.addEventListener('blur', () => ctx.onBlur(node.name))

	wrapper.appendChild(textarea)

	const errorSpan = document.createElement('span')
	applyClass(errorSpan, node.errorClass)
	wrapper.appendChild(errorSpan)

	ctx.scope.effect(() => {
		errorSpan.textContent = ctx.errors.get()[node.name] ?? ''
	})

	if (node.show) {
		ctx.scope.effect(() => {
			wrapper.style.display = node.show!(ctx.state.get()) ? '' : 'none'
		})
	}

	if (node.disabled !== undefined) {
		ctx.scope.effect(() => {
			textarea.disabled = resolveDisabled(node.disabled, ctx.state.get())
		})
	}

	return wrapper
}

function buildCheckbox(node: Checkbox<Record<string, unknown>>, ctx: FieldContext): HTMLElement {
	const wrapper = document.createElement('label')
	applyClass(wrapper, node.class)

	const input = document.createElement('input')
	input.type = 'checkbox'
	input.name = node.name
	if (node.required) input.required = true
	applyClass(input, node.inputClass)

	input.checked = Boolean(ctx.state.get()[node.name])

	input.addEventListener('change', () => {
		ctx.state.update((s) => ({ ...s, [node.name]: input.checked }))
		ctx.onChange(node.name)
	})
	input.addEventListener('blur', () => ctx.onBlur(node.name))

	wrapper.appendChild(input)

	if (node.label) {
		const labelText = document.createElement('span')
		labelText.textContent = node.label
		wrapper.appendChild(labelText)
	}

	const errorSpan = document.createElement('span')
	applyClass(errorSpan, node.errorClass)
	wrapper.appendChild(errorSpan)

	ctx.scope.effect(() => {
		errorSpan.textContent = ctx.errors.get()[node.name] ?? ''
	})

	if (node.show) {
		ctx.scope.effect(() => {
			wrapper.style.display = node.show!(ctx.state.get()) ? '' : 'none'
		})
	}

	if (node.disabled !== undefined) {
		ctx.scope.effect(() => {
			input.disabled = resolveDisabled(node.disabled, ctx.state.get())
		})
	}

	return wrapper
}

function buildRadio(node: Radio<Record<string, unknown>>, ctx: FieldContext): HTMLElement {
	const wrapper = document.createElement('fieldset')
	applyClass(wrapper, node.class)

	if (node.label) {
		const legend = document.createElement('legend')
		legend.textContent = node.label
		wrapper.appendChild(legend)
	}

	const initial = String(ctx.state.get()[node.name] ?? '')
	const inputs: HTMLInputElement[] = []

	for (const opt of node.options) {
		const optLabel = document.createElement('label')

		const input = document.createElement('input')
		input.type = 'radio'
		input.name = node.name
		input.value = opt.value
		if (node.required) input.required = true
		if (opt.disabled) input.disabled = true
		if (opt.value === initial) input.checked = true
		applyClass(input, node.inputClass)

		input.addEventListener('change', () => {
			if (input.checked) {
				ctx.state.update((s) => ({ ...s, [node.name]: input.value }))
				ctx.onChange(node.name)
			}
		})
		input.addEventListener('blur', () => ctx.onBlur(node.name))

		const optText = document.createElement('span')
		optText.textContent = opt.label

		optLabel.appendChild(input)
		optLabel.appendChild(optText)
		wrapper.appendChild(optLabel)
		inputs.push(input)
	}

	const errorSpan = document.createElement('span')
	applyClass(errorSpan, node.errorClass)
	wrapper.appendChild(errorSpan)

	ctx.scope.effect(() => {
		errorSpan.textContent = ctx.errors.get()[node.name] ?? ''
	})

	if (node.show) {
		ctx.scope.effect(() => {
			wrapper.style.display = node.show!(ctx.state.get()) ? '' : 'none'
		})
	}

	if (node.disabled !== undefined) {
		ctx.scope.effect(() => {
			const groupDisabled = resolveDisabled(node.disabled, ctx.state.get())
			for (let i = 0; i < inputs.length; i++) {
				inputs[i].disabled = node.options[i].disabled === true || groupDisabled
			}
		})
	}

	return wrapper
}

function buildButton(
	node: Button<Record<string, unknown>>,
	state: Signal<Record<string, unknown>>,
	scope: Scope,
): HTMLElement {
	const btn = document.createElement('button')
	btn.type = node.action ?? 'button'
	btn.textContent = node.label
	applyClass(btn, node.class)

	if (node.onClick) {
		btn.addEventListener('click', () => node.onClick!(state.get()))
	}

	if (node.disabled !== undefined) {
		scope.effect(() => {
			btn.disabled = resolveDisabled(node.disabled, state.get())
		})
	}

	return btn
}

function build(
	node: Form<Record<string, unknown>>,
	scope: Scope,
): HTMLElement {
	const state: Signal<Record<string, unknown>> = node.state
		?? signal<Record<string, unknown>>(node.initial)

	const errors: Signal<Record<string, string>> = node.errors
		? (node.errors as unknown as Signal<Record<string, string>>)
		: signal<Record<string, string>>({})

	const validateOn = node.validateOn ?? 'submit'
	const hasSchema = !!node.schema

	const fieldRuleSets: FieldRuleSet[] = node.children
		.filter(isFieldNode)
		.map((f) => ({
			name: f.name,
			rules: (f.rules ?? []) as unknown as ValidationRule[],
			isRequired: f.required === true,
		}))

	async function validateField(fieldName: string): Promise<void> {
		let error: string | null

		if (hasSchema) {
			error = await validateFieldWithSchema(state.get(), node.schema!, fieldName)
		} else {
			const set = fieldRuleSets.find(s => s.name === fieldName)
			if (!set) return
			error = validateFieldWithRules(state.get(), fieldName, set.rules, set.isRequired)
		}

		errors.update((prev) => {
			const next = { ...prev }
			if (error) next[fieldName] = error
			else delete next[fieldName]
			return next
		})
	}

	async function validateAll(): Promise<boolean> {
		const result = hasSchema
			? await validateWithSchema(state.get(), node.schema!)
			: validateWithRules(state.get(), fieldRuleSets)

		errors.set(result)
		return Object.keys(result).length === 0
	}

	function reset(): void {
		state.set({ ...node.initial })
		errors.set({})
		formEl.reset()
	}

	async function submit(): Promise<void> {
		const valid = await validateAll()
		if (!valid) return
		await node.onSubmit(state.get())
	}

	const formEl = document.createElement('form')
	applyClass(formEl, node.class)
	formEl.noValidate = true

	formEl.addEventListener('submit', (e) => {
		e.preventDefault()
		submit()
	})

	formEl.addEventListener('reset', (e) => {
		e.preventDefault()
		reset()
	})

	const fieldCtx: FieldContext = {
		state,
		errors,
		scope,
		onBlur: (name) => { if (validateOn === 'blur') validateField(name) },
		onChange: (name) => { if (validateOn === 'change') validateField(name) },
	}

	for (const child of node.children) {
		let el: HTMLElement
		switch (child.node) {
			case 'input': el = buildInput(child, fieldCtx); break
			case 'select': el = buildSelect(child, fieldCtx); break
			case 'textarea': el = buildTextarea(child, fieldCtx); break
			case 'checkbox': el = buildCheckbox(child, fieldCtx); break
			case 'radio': el = buildRadio(child, fieldCtx); break
			case 'button': el = buildButton(child, state, scope); break
			default: {
				const _exhaustive: never = child
				throw new Error('[dsl] Unknown form child type')
			}
		}
		formEl.appendChild(el)
	}

	if (node.controller) {
		node.controller.submit = submit
		node.controller.reset = reset
	}

	scopeMap.set(formEl, scope)
	return formEl
}

export function renderForm<TState extends Record<string, unknown>>(
	node: Form<TState>,
): HTMLElement {
	const parentScope = getScope()
	const scope = createScope()
	if (parentScope) parentScope.onCleanup(() => scope.dispose())

	return runInScope(scope, () => build(node as Form<Record<string, unknown>>, scope))
}