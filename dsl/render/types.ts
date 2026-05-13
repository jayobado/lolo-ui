// --- dsl/render/types.ts ---

import type { 
	Form, Field, FieldGroup, Repeater, 
	FieldBinding, GroupBinding, 
	FormHandle, RepeaterRow, RepeaterControls 
} from '../form/mod.ts'
import type { Table, Column, CellValue, TableControls } from '../table/mod.ts'
import type { ResolvedAction, ResolvedActionGroup } from '../action/mod.ts'
import type { ResolvedModal } from '../modal/mod.ts'
import type { ResolvedAlert } from '../alert-notification/mod.ts'
import type { TabsHandle } from '../tabs/mod.ts'
import type { StepsHandle } from '../steps/mod.ts'
import type { AccordionHandle } from '../accordion/mod.ts'
import type { BlockHandle } from '../block/mod.ts'
import type { PanelContent } from '../content.ts'


export interface FormRenderOptions {
	state?: Record<string, unknown>
	errors?: Record<string, string | undefined>
	onReady?: (handle: FormHandle) => void
}

export interface TableRenderOptions {
	rows: Record<string, unknown>[]
	errors?: Record<string, string | undefined>[]
	pagination?: {
		total: number
		page: number
		pageSize: number
		onPageChange: (page: number) => void
	}
	onSort?: (key: string, direction: 'asc' | 'desc') => void
	onFilter?: (key: string, value: unknown) => void
	onSelect?: (rows: Record<string, unknown>[]) => void
	onAction?: (action: string, row: Record<string, unknown>) => void
	addable?: boolean | (() => Record<string, unknown>)
	removable?: boolean | ((index: number, row: Record<string, unknown>) => boolean)
}

export interface ActionRenderOptions {
	onAction?: (action: string) => void
}

export interface StepsRenderOptions {
	onComplete?: () => void
}

export interface BlockRenderOptions {
	onAction?: (action: string) => void
}

export type ContentRenderer = (
	items: PanelContent[],
	onFormReady?: (index: number, handle: FormHandle) => void,
) => HTMLElement[]

export interface RendererConfig {
	fields?: Record<string, (field: Field, binding: FieldBinding) => HTMLElement>
	form?: (form: Form, children: HTMLElement[]) => HTMLElement
	group?: (group: FieldGroup, children: HTMLElement[], binding: GroupBinding) => HTMLElement
	repeater?: (repeater: Repeater, rows: RepeaterRow<HTMLElement>[], controls: RepeaterControls) => HTMLElement
	cell?: (column: Column, cell: CellValue, row: Record<string, unknown>) => HTMLElement
	row?: (row: Record<string, unknown>, cells: HTMLElement[], actions: ResolvedAction[]) => HTMLElement
	table?: (table: Table, rows: HTMLElement[], controls: TableControls) => HTMLElement
	action?: (resolved: ResolvedAction) => HTMLElement
	actionGroup?: (resolved: ResolvedActionGroup) => HTMLElement
	modal?: (resolved: ResolvedModal, renderContent: ContentRenderer, onAction: (action: string) => void) => HTMLElement
	alert?: (resolved: ResolvedAlert) => HTMLElement
	tabs?: (handle: TabsHandle, renderContent: ContentRenderer) => HTMLElement
	steps?: (handle: StepsHandle, renderContent: ContentRenderer, onComplete?: () => void) => HTMLElement
	accordion?: (handle: AccordionHandle, renderContent: ContentRenderer) => HTMLElement
	block?: (handle: BlockHandle, renderContent: ContentRenderer) => HTMLElement
}