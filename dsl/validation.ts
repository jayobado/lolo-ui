import type { Field } from './form/types.ts'

function resolveRule<T>(rule: T | { value: T; message: string }): { value: T; message?: string } {
	if (typeof rule === 'object' && rule !== null && 'value' in rule) {
		return rule as { value: T; message: string }
	}
	return { value: rule as T }
}

export function validateField(field: Field, value: unknown, state: Record<string, unknown>): string | undefined {
	const rules = field.rules
	if (!rules) return undefined

	const label = field.label ?? field.name

	if (rules.required) {
		const { value: req, message } = resolveRule(rules.required)
		if (req && (value === undefined || value === null || value === '')) {
			return message ?? `${label} is required`
		}
	}

	if (typeof value === 'string') {
		if (rules.minLength) {
			const { value: min, message } = resolveRule(rules.minLength)
			if (value.length < min) return message ?? `Must be at least ${min} characters`
		}
		if (rules.maxLength) {
			const { value: max, message } = resolveRule(rules.maxLength)
			if (value.length > max) return message ?? `Must be at most ${max} characters`
		}
		if (rules.pattern) {
			const { value: pat, message } = resolveRule(rules.pattern)
			if (!new RegExp(pat).test(value)) return message ?? 'Invalid format'
		}
	}

	if (typeof value === 'number') {
		if (rules.min) {
			const { value: min, message } = resolveRule(rules.min)
			if (value < min) return message ?? `Must be at least ${min}`
		}
		if (rules.max) {
			const { value: max, message } = resolveRule(rules.max)
			if (value > max) return message ?? `Must be at most ${max}`
		}
	}

	if (rules.match) {
		const { value: otherName, message } = resolveRule(rules.match)
		if (value !== state[otherName]) return message ?? `Must match ${otherName}`
	}

	if (rules.custom) {
		return rules.custom(value, state)
	}

	return undefined
}
