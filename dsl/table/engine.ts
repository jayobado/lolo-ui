import type { 
	CellHandler, 
	RowHandler, 
	TableHandler,
	CellBinding,
	CellValue,
	Column,
	RowAction,
	TableControls,
	Table
} from "./types.ts";
import type { Field } from "../form/types.ts";
import type { ResolvedAction } from '../action/resolve.ts'
import { validateField } from '../validation.ts';


export interface TableConfig<Element> {
	cell: CellHandler<Element>
	row: RowHandler<Element>
	table: TableHandler<Element>
	validate?: (value: unknown, field: Field, row: Record<string, unknown>) => string | undefined
};

export interface TableOptions {
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
};


export function createTableEngine<Element>(cfg: TableConfig<Element>) {
	const { cell: cellHandler, row: rowHandler, table: tableHandler } = cfg;

	function validate(value: unknown, field: Field, row: Record<string, unknown>): string | undefined {
		if (cfg.validate) {
			return cfg.validate(value, field, row)
		}
		return validateField(field, value, row)
	}

	function resolveCell(
		column: Column,
		row: Record<string, unknown>,
		rowIndex: number,
		errors: Record<string, string | undefined>[]
	): CellValue {
		if (column.field) {
			const field = column.field

			const binding: CellBinding = {
				get value() { return row[column.key] },
				get error() { return errors[rowIndex]?.[column.key] },
				get disabled() { return false },
				onChange: (value: unknown) => {
					row[column.key] = value
					if (!errors[rowIndex]) errors[rowIndex] = {}
					errors[rowIndex][column.key] = validate(value, field, row)
				},
				onBlur: () => {
					if (!errors[rowIndex]) errors[rowIndex] = {}
					errors[rowIndex][column.key] = validate(row[column.key], field, row)
				},
			}

			return { mode: 'editable', field, binding }
		}

		const value = row[column.key]

		if (column.cell) {
			return { mode: 'display', display: column.cell(value, row) }
		}

		if (column.format) {
			return { mode: 'formatted', text: column.format(value, row) }
		}
		return { mode: 'raw', value }
	}

	function resolveActions(
		actions: RowAction[],
		row: Record<string, unknown>,
		onAction?: (action: string, row: Record<string, unknown>) => void
	): ResolvedAction[] {
		return actions.map(action => {
			const toggle = action.toggle?.(row)

			return {
				label: action.label,
				action: action.action,
				icon: undefined,
				variant: undefined,
				href: undefined,
				get hidden() { return action.toggle?.(row) === 'hide' },
				get disabled() { return action.toggle?.(row) === 'disable' },
				get loading() { return false },
				execute: () => onAction?.(action.action, row),
			}
		})
	}

	function buildNewRow(columns: Column[]): Record<string, unknown> {
		const row: Record<string, unknown> = {}
		for (const col of columns) {
			if (col.field) {
				row[col.key] = col.field.default ?? undefined
			}
		}
		return row
	}

	function render(table: Table, options: TableOptions): Element {
		const rows = options.rows
		const errors: Record<string, string | undefined>[] = [];

		const addable = options.addable;
		const addRow = addable ? () => {
			const newRow = typeof addable === 'function' ? addable() : buildNewRow(table.columns)
			rows.push(newRow)
		} : undefined;

		const removable = options.removable;
		const removeRow = removable ? (index: number) => {
			if (typeof removable === 'function') {
				if (!removable(index, rows[index])) return
			}
			rows.splice(index, 1)
			errors.splice(index, 1)
		} : undefined;

		// Build controls for table handler
		const controls: TableControls = { addRow, pagination: options.pagination };

		// Render rows
		const renderedRows = rows.map((row, rowIndex) => {
			const cells = table.columns.map(column => cellHandler(column, resolveCell(column, row, rowIndex, errors), row));
			const actions = resolveActions(table.actions ?? [], row, options.onAction);

			if (removeRow) {
				actions.push({
					label: 'Remove',
					action: '__remove',
					icon: undefined,
					variant: undefined,
					href: undefined,
					get hidden() { return false },
					get disabled() { return false },
					get loading() { return false },
					execute: () => removeRow(rowIndex),
				})
			}
			return rowHandler(row, cells, actions);
		});

		return tableHandler(table, renderedRows, controls);
	};

	return { render };
}