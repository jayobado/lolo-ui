import type { Alert } from './types.ts';

export interface ResolvedAlert {
	readonly message: string
	severity: string
	dismissible: boolean
	readonly hidden: boolean
	dismiss?: () => void
}

export function resolveAlert(alert: Alert, onAction?: (action: string) => void): ResolvedAlert {
	return {
		get message() {
			return typeof alert.message === 'function' ? alert.message() : alert.message
		},
		severity: alert.severity,
		dismissible: alert.dismissible ?? false,
		get hidden() { return alert.toggle?.({}) === 'hide' },
		dismiss: alert.dismissible && alert.dismissAction
			? () => onAction?.(alert.dismissAction!)
			: undefined,
	}
}