export interface Column<T> {
	key: string
	header: string
	render?: (row: T, index: number) => HTMLElement | string
	headerClass?: string
	cellClass?: string
}

export interface DataTableProps<T> {
	columns: Column<T>[]
	rows: T[]
	class?: string
	headerClass?: string
	rowClass?: string | ((row: T, index: number) => string)
	emptyText?: string
	rowKey?: (row: T, index: number) => string | number
	onRowClick?: (row: T, index: number) => void
}

export function dataTable<T extends Record<string, unknown>>(
	props: DataTableProps<T>,
): HTMLElement {
	const { columns, rows, emptyText = 'No data' } = props

	const table = document.createElement('table')
	if (props.class) table.className = props.class

	const thead = document.createElement('thead')
	const headerRow = document.createElement('tr')
	if (props.headerClass) headerRow.className = props.headerClass

	for (const col of columns) {
		const th = document.createElement('th')
		if (col.headerClass) th.className = col.headerClass
		th.textContent = col.header
		headerRow.appendChild(th)
	}

	thead.appendChild(headerRow)
	table.appendChild(thead)

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

			if (props.rowClass) {
				const cls = typeof props.rowClass === 'function'
					? props.rowClass(row, index)
					: props.rowClass
				if (cls) tr.className = cls
			}

			if (props.onRowClick) {
				tr.style.cursor = 'pointer'
				tr.addEventListener('click', () => props.onRowClick!(row, index))
			}

			for (const col of columns) {
				const td = document.createElement('td')
				if (col.cellClass) td.className = col.cellClass

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