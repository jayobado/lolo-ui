import { effect as effectFn } from './signals.ts'

type CleanupFn = () => void

export interface ComponentContext {
	onMount: (fn: () => void | Promise<void>) => void
	onUnmount: (fn: CleanupFn) => void
	effect: (fn: () => void) => void
}

export interface ComponentDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  (props: P): HTMLElement
  _isComponent: true
}

// ─── Lifecycle registries ─────────────────────────────────────────────────
// WeakMap so entries are garbage collected when the element is removed

const mountCallbacks = new WeakMap<HTMLElement, Array<() => void | Promise<void>>>()
const unmountCallbacks = new WeakMap<HTMLElement, CleanupFn[]>()
const effectCleanups = new WeakMap<HTMLElement, CleanupFn[]>()

// ─── Lifecycle runners — called by the router ─────────────────────────────

export function runMount(el: HTMLElement): void {
	mountCallbacks.get(el)?.forEach(fn => fn())
}

export function runUnmount(el: HTMLElement): void {
	unmountCallbacks.get(el)?.forEach(fn => fn())
	effectCleanups.get(el)?.forEach(fn => fn())
}

// ─── defineComponent ──────────────────────────────────────────────────────

export function defineComponent<P extends Record<string, unknown> = Record<string, unknown>>(
	setup: (props: P, ctx: ComponentContext) => HTMLElement
): ComponentDefinition<P> {
	const factory = (props: P): HTMLElement => {
		const mounts: Array<() => void | Promise<void>> = []
		const unmounts: CleanupFn[] = []
		const cleanups: CleanupFn[] = []

		const ctx: ComponentContext = {
			onMount: fn => mounts.push(fn),

			onUnmount: fn => unmounts.push(fn),

			// Effects registered here are automatically disposed when the
			// component unmounts — no manual cleanup needed in the component
			effect: fn => {
				const dispose = effectFn(fn)
				cleanups.push(dispose)
			},
		}

		const rootEl = setup(props, ctx)

		mountCallbacks.set(rootEl, mounts)
		unmountCallbacks.set(rootEl, unmounts)
		effectCleanups.set(rootEl, cleanups)

		return rootEl
	}

	;(factory as ComponentDefinition<P>)._isComponent = true
	return factory as ComponentDefinition<P>
}