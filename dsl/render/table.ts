import { div, span, a, button, tr, th, td, thead, tbody, table as tableEl } from '../../dom.ts'
import type { Table } from '../table/mod.ts'
import { createTableEngine } from '../table/mod.ts'
import type { RendererConfig, TableRenderOptions } from './types.ts'
import { reactiveText, reactiveDisplay, reactiveDisabled } from './reactive.ts'
import { renderFieldInput } from './field-input.ts'

export function createTableRenderer(overrides: RendererConfig) {
	const engine = createTableEngine<HTMLElement>({
		cell: overrides.cell ?? ((column, cell, row) => {
			const cellEl = td()

			switch (cell.mode) {
				case 'raw':
					reactiveText(cellEl, () => String(row[column.key] ?? ''))
					break

				case 'formatted':
					cellEl.textContent = cell.text
					break

				case 'display': {
					const d = cell.display
					switch (d.type) {
						case 'badge':
							cellEl.append(span({ class: `badge badge--${d.variant ?? 'neutral'}` }, d.label))
							break
						case 'link':
							cellEl.append(a({ href: d.href as string }, d.label))
							break
						default:
							cellEl.textContent = d.label
					}
					break
				}

				case 'editable': {
					cellEl.append(renderFieldInput(cell.field, {
						get value() { return cell.binding.value },
						get error() { return cell.binding.error },
						get disabled() { return cell.binding.disabled },
						get hidden() { return false },
						onChange: cell.binding.onChange,
						onBlur: cell.binding.onBlur,
					}))

					const errorEl = span({ class: 'cell-error' })
					reactiveDisplay(errorEl, () => !!cell.binding.error)
					reactiveText(errorEl, () => cell.binding.error ?? '')
					cellEl.append(errorEl)
					break
				}
			}

			return cellEl
		}),

		row: overrides.row ?? ((_, cells, actions) => {
			const rowEl = tr()
			for (const cell of cells) rowEl.append(cell)

			if (actions.length > 0) {
				const actionCell = td({ class: 'actions' })
				for (const action of actions) {
					const btn = button({ type: 'button' }, action.label)
					reactiveDisplay(btn, () => !action.hidden)
					reactiveDisabled(btn, () => action.disabled)
					btn.addEventListener('click', action.execute)
					actionCell.append(btn)
				}
				rowEl.append(actionCell)
			}

			return rowEl
		}),

		table: overrides.table ?? ((tableDef, rows, controls) => {
			const wrapper = div({ class: 'table-wrapper' })
			const tbl = tableEl()

			const head = thead()
			const headerRow = tr()
			for (const col of tableDef.columns) {
				headerRow.append(th(null, col.label ?? col.key))
			}
			if (tableDef.actions?.length) {
				headerRow.append(th(null, 'Actions'))
			}
			head.append(headerRow)
			tbl.append(head)

			const body = tbody()
			for (const row of rows) body.append(row)
			tbl.append(body)
			wrapper.append(tbl)

			if (controls.addRow) {
				const addBtn = button({ type: 'button', class: 'table-add-row' }, '+ Add Row')
				addBtn.addEventListener('click', controls.addRow)
				wrapper.append(addBtn)
			}

			if (controls.pagination) {
				const pg = controls.pagination
				const totalPages = Math.ceil(pg.total / pg.pageSize)
				const nav = div({ class: 'pagination' })

				const prevBtn = button({ type: 'button' }, '← Previous')
				reactiveDisabled(prevBtn, () => pg.page <= 1)
				prevBtn.addEventListener('click', () => pg.onPageChange(pg.page - 1))
				nav.append(prevBtn)

				const pageText = span()
				reactiveText(pageText, () => `Page ${pg.page} of ${totalPages}`)
				nav.append(pageText)

				const nextBtn = button({ type: 'button' }, 'Next →')
				reactiveDisabled(nextBtn, () => pg.page >= totalPages)
				nextBtn.addEventListener('click', () => pg.onPageChange(pg.page + 1))
				nav.append(nextBtn)

				wrapper.append(nav)
			}

			return wrapper
		}),
	})

	return function renderTable(table: Table, options: TableRenderOptions): HTMLElement {
		return engine.render(table, {
			rows: options.rows,
			errors: options.errors,
			pagination: options.pagination,
			onSort: options.onSort,
			onFilter: options.onFilter,
			onSelect: options.onSelect,
			onAction: options.onAction,
			addable: options.addable,
			removable: options.removable,
		})
	}
}