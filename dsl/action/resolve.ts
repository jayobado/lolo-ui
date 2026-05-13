import type { Action, ActionGroup } from "./types.ts";

export interface ResolvedAction {
	label: string
	action?: string
	icon?: string
	variant?: string
	href?: string
	readonly hidden: boolean
	readonly disabled: boolean
	readonly loading: boolean
	execute: () => void
}

export interface ResolvedActionGroup {
	label?: string
	icon?: string
	readonly hidden: boolean
	readonly disabled: boolean
	items: ResolvedAction[]
}

export interface ResolveOptions {
	context?: Record<string, unknown>
	onAction?: (action: string) => void
}

export function resolveAction(action: Action, options: ResolveOptions = {}): ResolvedAction {
	const ctx = options.context ?? {}

	return {
		label: action.label,
		action: action.action,
		icon: action.icon,
		variant: action.variant,
		href: action.href,
		get hidden() { return action.toggle?.(ctx) === 'hide' },
		get disabled() { return action.toggle?.(ctx) === 'disable' },
		get loading() { return action.loading?.(ctx) ?? false },
		execute: () => {
			if (action.action) options.onAction?.(action.action)
		},
	}
}

export function resolveActionGroup(group: ActionGroup, options: ResolveOptions = {}): ResolvedActionGroup {
	const ctx = options.context ?? {}

	return {
		label: group.label,
		icon: group.icon,
		get hidden() { return group.toggle?.(ctx) === 'hide' },
		get disabled() { return group.toggle?.(ctx) === 'disable' },
		items: group.items.map(item => resolveAction(item, options)),
	}
}