import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Signal } from '../../core/signals.ts'

export type ClassValue = string | string[] | undefined

export interface ValidationRule<TState extends Record<string, unknown> = Record<string, unknown>> {
	test: (value: unknown, state: TState) => boolean
	message: string
}

interface Field<TState extends Record<string, unknown>> {
	name: keyof TState & string
	label?: string

	class?: ClassValue   // applied to wrapper (label or fieldset)
	inputClass?: ClassValue   // applied to the input element
	errorClass?: ClassValue   // applied to the error <span>

	required?: boolean           // sets HTML required attr; if no schema, prepends a required rule
	rules?: ValidationRule<TState>[]  // ignored when form.schema is set

	show?: (state: TState) => boolean
	disabled?: boolean | ((state: TState) => boolean)
}

export interface Input<TState extends Record<string, unknown>> extends Field<TState> {
	node: 'input'
	
	type?: 
		|'text' 
		| 'email' 
		| 'password' 
		| 'number' 
		| 'tel' 
		| 'url' 
		| 'search' 
		| 'date' 
		| 'time' 
		| 'datetime-local' 
		| 'month' 
		| 'week' 
		| 'color' 
		| 'range'
	
	placeholder?: string
	autocomplete?: AutoFill
}

export interface Select<TState extends Record<string, unknown>> extends Field<TState> {
	node: 'select'
	options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>
	placeholder?: string
}

export interface Textarea<TState extends Record<string, unknown>> extends Field<TState> {
	node: 'textarea'
	placeholder?: string
	rows?: number
}

export interface Checkbox<TState extends Record<string, unknown>> extends Field<TState> {
	node: 'checkbox'
}

export interface Radio<TState extends Record<string, unknown>> extends Field<TState> {
	node: 'radio'
	options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>
}

export interface Button<TState extends Record<string, unknown> = Record<string, unknown>> {
	node: 'button'
	label: string
	class?: ClassValue
	action?: 'submit' | 'reset' | 'button'   // default 'button'
	disabled?: boolean | ((state: TState) => boolean)
	onClick?: (state: TState) => void
}

export type FormChild<TState extends Record<string, unknown> = Record<string, unknown>> =
	| Input<TState>
	| Select<TState>
	| Textarea<TState>
	| Checkbox<TState>
	| Radio<TState>
	| Button<TState>

export interface FormController {
	submit: () => void
	reset: () => void
}

export interface Form<TState extends Record<string, unknown> = Record<string, unknown>> {
	node: 'form'
	class?: ClassValue

	initial: TState
	onSubmit: (state: TState) => void | Promise<void>

	validateOn?: 'submit' | 'blur' | 'change'   // default 'submit'
	schema?: StandardSchemaV1                // takes precedence over per-field rules + required

	// Optional refs — engine writes through these
	state?: Signal<TState>
	errors?: Signal<Partial<Record<keyof TState, string>>>
	controller?: FormController

	children: readonly FormChild<TState>[]
}