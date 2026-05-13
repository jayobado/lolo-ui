import type { Notification, NotifyOptions } from './types.ts';

export interface Notifier {
	notify: (options: NotifyOptions) => string
	dismiss: (id: string) => void
	readonly notifications: Notification[]
	subscribe: (callback: () => void) => () => void
};

let counter = 0
function generateId(): string {
	return `nf-${++counter}`
}

export function createNotifier(defaults?: { duration?: number; dismissible?: boolean }): Notifier {
	const notifications: Notification[] = []
	const listeners = new Set<() => void>()

	function emit() {
		for (const fn of listeners) fn()
	}

	function notify(options: NotifyOptions): string {
		const id = generateId()
		const duration = options.duration ?? defaults?.duration ?? 5000

		const notification: Notification = {
			id,
			message: options.message,
			severity: options.severity ?? 'info',
			duration,
			dismissible: options.dismissible ?? defaults?.dismissible ?? true,
		}

		notifications.push(notification)
		emit()

		if (duration > 0) {
			setTimeout(() => dismiss(id), duration)
		}

		return id
	}

	function dismiss(id: string) {
		const index = notifications.findIndex(n => n.id === id)
		if (index !== -1) {
			notifications.splice(index, 1)
			emit()
		}
	}

	return {
		notify,
		dismiss,
		get notifications() { return notifications },
		subscribe: (callback) => {
			listeners.add(callback)
			return () => listeners.delete(callback)
		},
	}
}