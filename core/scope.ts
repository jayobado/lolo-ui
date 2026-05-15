import { effect as rawEffect } from './signals.ts'

type CleanupFn = () => void

export interface Scope {
	effect: (fn: () => void) => void
	onCleanup: (fn: CleanupFn) => void
	dispose: () => void
}

let activeScope: Scope | null = null

export function getScope(): Scope | null {
	return activeScope
}

export function resolveScope(explicit?: Scope): Scope | null {
	return explicit ?? activeScope
}

export function createScope(): Scope {
	const cleanups: CleanupFn[] = []

	const scope: Scope = {
		effect(fn) {
			const dispose = rawEffect(fn)
			cleanups.push(dispose)
		},

		onCleanup(fn) {
			cleanups.push(fn)
		},

		dispose() {
			cleanups.forEach(fn => fn())
			cleanups.length = 0
		},
	}

	return scope
}

export function runInScope<T>(scope: Scope, fn: () => T): T {
	const prev = activeScope
	activeScope = scope
	try {
		return fn()
	} finally {
		activeScope = prev
	}
}