import { css } from '../css.ts'
import type { StyleObject } from '../css.ts'

export interface Column<T> {
	key: string
	header: string
	render?: (row: T, index: number) => HTMLElement | string
	headerStyles?: StyleObject
	cellStyles?: StyleObject
}

export interface DataTableProps<T> {
	columns: Column<T>[]
	rows: T[]
	class?: string
	styles?: StyleObject
	headerStyles?: StyleObject
	rowStyles?: StyleObject | ((row: T, index: number) => StyleObject)
	emptyText?: string
	rowKey?: (row: T, index: number) => string | number
	onRowClick?: (row: T, index: number) => void
}

export function dataTable<T extends Record<string, unknown>>(
	props: DataTableProps<T>,
): HTMLElement {
	const { columns, rows, emptyText = 'No data' } = props

	const table = document.createElement('table')
	const classes: string[] = []
	if (props.class) classes.push(props.class)
	if (props.styles) classes.push(css(props.styles))
	if (classes.length) table.className = classes.join(' ')

	// Header
	const thead = document.createElement('thead')
	const headerRow = document.createElement('tr')
	if (props.headerStyles) headerRow.className = css(props.headerStyles)

	for (const col of columns) {
		const th = document.createElement('th')
		if (col.headerStyles) th.className = css(col.headerStyles)
		th.textContent = col.header
		headerRow.appendChild(th)
	}

	thead.appendChild(headerRow)
	table.appendChild(thead)

	// Body
	const tbody = document.createElement('tbody')

	if (rows.length === 0) {
		const tr = document.createElement('tr')
		const td = document.createElement('td')
		td.colSpan = columns.length
		td.textContent = emptyText
		tr.appendChild(td)
		tbody.appendChild(tr)
	} else {
		rows.forEach((row, index) => {
			const tr = document.createElement('tr')

			if (props.rowStyles) {
				const s = typeof props.rowStyles === 'function'
					? props.rowStyles(row, index)
					: props.rowStyles
				tr.className = css(s)
			}

			if (props.onRowClick) {
				tr.style.cursor = 'pointer'
				tr.addEventListener('click', () => props.onRowClick!(row, index))
			}

			for (const col of columns) {
				const td = document.createElement('td')
				if (col.cellStyles) td.className = css(col.cellStyles)

				const content = col.render
					? col.render(row, index)
					: String(row[col.key] ?? '')

				if (typeof content === 'string') {
					td.textContent = content
				} else {
					td.appendChild(content)
				}

				tr.appendChild(td)
			}

			tbody.appendChild(tr)
		})
	}

	table.appendChild(tbody)

	return table
}