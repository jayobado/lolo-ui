import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ValidationRule } from './types.ts'


export const required = <TState extends Record<string, unknown> = Record<string, unknown>>(
	message = 'Required',
): ValidationRule<TState> => ({
	test: (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0),
	message,
})

export const custom = <TState extends Record<string, unknown> = Record<string, unknown>>(
	test: (value: unknown, state: TState) => boolean,
	message: string,
): ValidationRule<TState> => ({ test, message })

// ─── Internal validation (non-generic, operates on untyped Record) ────────

export interface FieldRuleSet {
	name: string
	rules: ValidationRule[]
	isRequired: boolean
}

export function validateWithRules(
	state: Record<string, unknown>,
	fields: FieldRuleSet[],
): Record<string, string> {
	const errors: Record<string, string> = {}

	for (const { name, rules, isRequired } of fields) {
		const value = state[name]
		const allRules: ValidationRule[] = isRequired ? [required(), ...rules] : rules

		for (const rule of allRules) {
			if (!rule.test(value, state)) {
				errors[name] = rule.message
				break
			}
		}
	}

	return errors
}

export function validateFieldWithRules(
	state: Record<string, unknown>,
	fieldName: string,
	rules: ValidationRule[],
	isRequired: boolean,
): string | null {
	const value = state[fieldName]
	const allRules: ValidationRule[] = isRequired ? [required(), ...rules] : rules

	for (const rule of allRules) {
		if (!rule.test(value, state)) {
			return rule.message
		}
	}
	return null
}

export async function validateWithSchema(
	state: Record<string, unknown>,
	schema: StandardSchemaV1,
): Promise<Record<string, string>> {
	const result = await schema['~standard'].validate(state)

	if (!('issues' in result) || !result.issues) {
		return {}
	}

	const errors: Record<string, string> = {}

	for (const issue of result.issues) {
		const path = issue.path ?? []
		if (path.length === 0) continue

		const first = path[0]
		const fieldName = typeof first === 'object' && first !== null
			? String(first.key)
			: String(first)

		if (!(fieldName in errors)) {
			errors[fieldName] = issue.message
		}
	}

	return errors
}

export async function validateFieldWithSchema(
	state: Record<string, unknown>,
	schema: StandardSchemaV1,
	fieldName: string,
): Promise<string | null> {
	const errors = await validateWithSchema(state, schema)
	return errors[fieldName] ?? null
}