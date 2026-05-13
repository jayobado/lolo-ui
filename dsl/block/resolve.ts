import type { Block } from './types'
import type { PanelContent } from '../content'
import type { ResolvedAction } from '../action/resolve'
import { resolveAction } from '../action/resolve'


export interface BlockHandle {
	id?: string
	icon?: string
	readonly title?: string
	readonly subtitle?: string
	content: PanelContent[]
	headerActions: ResolvedAction[]
	readonly hidden: boolean
	readonly collapsed: boolean
	readonly loading: boolean
	toggleCollapse: () => void
	close: () => void
	setLoading: (value: boolean) => void
}

export function resolveBlock(block: Block, onAction?: (action: string) => void): BlockHandle {
	let collapsed = block.defaultCollapsed ?? false
	let closed = false
	let loading = false

	const content = Array.isArray(block.content) ? block.content : [block.content]

	const headerActions = (block.header?.actions ?? []).map(action =>
		resolveAction(action, { onAction })
	)

	return {
		id: block.id,
		icon: block.header?.icon,

		get title() {
			const t = block.header?.title?.content
			if (!t) return undefined
			return typeof t === 'function' ? t() : t
		},

		get subtitle() {
			const s = block.header?.title?.subtitle
			if (!s) return undefined
			return typeof s === 'function' ? s() : s
		},

		content,
		headerActions,

		get hidden() {
			return closed || block.toggle?.({}) === 'hide'
		},

		get collapsed() {
			return collapsed
		},

		get loading() {
			return loading
		},

		toggleCollapse: () => {
			collapsed = !collapsed
		},

		close: () => {
			closed = true
			onAction?.('close')
		},

		setLoading: (value: boolean) => {
			loading = value
		},
	}
}