import type { Node } from '../node.ts';

type Severity = 'info' | 'warning' | 'error' | 'success'

interface Alert extends Node {
	type: 'alert'
	message: string | (() => string)
	severity: Severity
	dismissible?: boolean
	dismissAction?: string
}

interface Notification {
	id: string
	message: string
	severity: Severity
	duration: number
	dismissible: boolean
}

interface NotifyOptions {
	message: string
	severity?: Severity
	duration?: number
	dismissible?: boolean
}

export type {
	Severity,
	Alert,
	Notification,
	NotifyOptions,
};