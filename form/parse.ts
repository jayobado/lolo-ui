import type { StandardSchemaV1 } from '@standard-schema/spec'

import { signal, effect } from '../signals.ts'
import { resolveScope } from '../scope.ts'
import type { Scope } from '../scope.ts'
import type { ErrorsFormatter, StandardErrors } from './errors.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseOptions<TSchema extends StandardSchemaV1, TErrors> {
	input?: () => unknown
	schema: () => TSchema
	formatErrors?: ErrorsFormatter<TErrors>
}

export interface ParseReturn<TSchema extends StandardSchemaV1, TErrors> {
	output: { get: () => StandardSchemaV1.InferOutput<TSchema> | undefined }
	errors: { get: () => TErrors | undefined }
	dispose: () => void
}

// ─── Implementation ──────────────────────────────────────────────────────────

export function useParse<TSchema extends StandardSchemaV1, TErrors = StandardErrors>(
	options: ParseOptions<TSchema, TErrors>,
	scope?: Scope,
): ParseReturn<TSchema, TErrors> {
	type Output = StandardSchemaV1.InferOutput<TSchema>

	const s = resolveScope(scope)

	const output = signal<Output | undefined>(undefined)
	const errors = signal<TErrors | undefined>(undefined)
	const formatErrors = options.formatErrors
		?? ((issues: StandardErrors) => issues as TErrors)

	let generation = 0

	function apply(result: StandardSchemaV1.Result<Output>): void {
		if (result.issues) {
			output.set(undefined)
			errors.set(formatErrors(result.issues))
		} else {
			output.set(result.value)
			errors.set(undefined)
		}
	}

	const dispose = effect(() => {
		const schema = options.schema()
		const input = options.input?.()
		const current = ++generation
		const resultOrPromise = schema['~standard'].validate(input)

		if (resultOrPromise instanceof Promise) {
			resultOrPromise.then(r => {
				if (current === generation) apply(r)
			})
		} else {
			apply(resultOrPromise)
		}
	})

	s?.onCleanup(dispose)

	return { output, errors, dispose }
}