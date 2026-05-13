import type { Modal, ModalItem } from './types.ts'
import { resolveAction } from '../action/resolve.ts'
import type { ResolvedAction } from '../action/resolve.ts'

export interface ResolvedModal {
	title?: string
	size: string
	closable: boolean
	closeAction?: string
	content: ModalItem[]
	footer: ResolvedAction[]
	readonly hidden: boolean
}

export function resolveModal(modal: Modal, onAction?: (action: string) => void): ResolvedModal {
	const content = modal.content === undefined
		? []
		: Array.isArray(modal.content)
			? modal.content
			: [modal.content]

	const footer = (modal.footer ?? []).map(action =>
		resolveAction(action, { onAction })
	)

	return {
		title: modal.title,
		size: modal.size ?? 'md',
		closable: modal.closable ?? true,
		closeAction: modal.closeAction,
		content,
		footer,
		get hidden() { return modal.toggle?.({}) === 'hide' },
	}
}