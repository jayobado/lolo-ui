import type { Node } from '../node.ts';
import type { Field } from '../form/types.ts';
import type { ResolvedAction } from '../action/resolve.ts';

interface CellDisplay {
	type: string
	label: string
	[key: string]: unknown
};

interface Column {
	key: string
	label?: string
	sortable?: boolean
	field?: Field
	format?: (value: unknown, row: Record<string, unknown>) => string
	cell?: (value: unknown, row: Record<string, unknown>) => CellDisplay
};

interface RowAction {
	label: string
	action: string
	toggle?: (row: Record<string, unknown>) => 'hide' | 'disable' | undefined
};

interface Table extends Node {
	type: 'table'
	columns: Column[]
	actions?: RowAction[]
	selectable?: boolean
};

interface CellBinding {
	readonly value: unknown
	readonly error: string | undefined
	readonly disabled: boolean
	onChange: (value: unknown) => void
	onBlur: () => void
};

type CellValue =
	| { mode: 'raw'; value: unknown }
	| { mode: 'formatted'; text: string }
	| { mode: 'display'; display: CellDisplay }
	| { mode: 'editable'; field: Field; binding: CellBinding }
/*
interface ResolvedAction {
	label: string
	action: string
	readonly hidden: boolean
	readonly disabled: boolean
	execute: () => void
};*/

interface TableControls {
	addRow?: () => void
	pagination?: {
		total: number
		page: number
		pageSize: number
		onPageChange: (page: number) => void
	}
};

type CellHandler<Element> = (column: Column, cell: CellValue, row: Record<string, unknown>) => Element;
type RowHandler<Element> = (row: Record<string, unknown>, cells: Element[], actions: ResolvedAction[]) => Element;
type TableHandler<Element> = (table: Table, rows: Element[], controls: TableControls) => Element;

export type {
	CellDisplay,
	Column,
	RowAction,
	Table,
	CellBinding,
	CellValue,
	ResolvedAction,
	TableControls,
	CellHandler,
	RowHandler,
	TableHandler,
};