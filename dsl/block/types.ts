import type { Node } from '../node.ts'
import type { PanelContent } from '../content.ts'
import type { Action } from '../action/types.ts'

export interface BlockTitle {
	content: string | (() => string)
	subtitle?: string | (() => string)
}

export interface BlockHeader {
	title?: BlockTitle
	icon?: string
	actions?: Action[]
}

export interface Block extends Node {
	type: 'block'
	id?: string
	header?: BlockHeader
	content: PanelContent | PanelContent[]
	collapsible?: boolean
	closable?: boolean
	defaultCollapsed?: boolean
}