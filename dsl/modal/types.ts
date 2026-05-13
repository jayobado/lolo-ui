import type { Node } from '../node.ts'
import type { Action } from '../action/types.ts'
import type { Form } from '../form/types.ts'
import type { Table } from '../table/types.ts'

type ModalItem = string | Form | Table

 interface Modal extends Node {
	type: 'modal'
	title?: string
	size?: string
	closable?: boolean
	closeAction?: string
	content?: ModalItem | ModalItem[]
	footer?: Action[]
}

export type { Modal, ModalItem }