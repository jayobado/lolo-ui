import { signal, effect } from '../signals.ts'
import {
	div, span, p, h2, h3, small,
	button, a, img, label, fieldset,
	input, select, option, textarea,
	table as tableEl, thead, tbody, tr, th, td,
} from '../dom.ts'
import type { InputProps } from '../dom.ts'
import { useModal } from '../hooks/modal.ts'
import { useDropdown } from '../hooks/dropdown.ts'
import type { DropdownItem } from '../hooks/dropdown.ts'

import type { 
	Form, 
	Field, 
	FieldGroup, 
	Repeater, 
	Item,
	FieldBinding, 
	GroupBinding, 
	FormHandle, 
	RepeaterRow, 
	RepeaterControls 
} from './form/mod.ts'
import { createFormEngine, collectDefaults, collectRowDefaults } from './form/mod.ts'

import type { 
	Table, 
	Column, 
	CellDisplay, 
	RowAction, 
	CellValue, 
	TableControls, 
	ResolvedAction as TableResolvedAction 
} from './table/mod.ts'
import { createTableEngine } from './table/mod.ts'

import type { Action, ActionGroup, ResolvedAction, ResolvedActionGroup } from './action/mod.ts'
import { resolveAction, resolveActionGroup } from './action/mod.ts'

import type { Modal, ResolvedModal } from './modal/mod.ts'
import { resolveModal } from './modal/mod.ts'

import type { Alert } from './alert-notification/types.ts'
import type { ResolvedAlert } from './alert-notification/resolve.ts'
import { resolveAlert } from './alert-notification/resolve.ts'

import type { Tabs, TabsHandle } from './tabs/mod.ts'
import { resolveTabs } from './tabs/mod.ts'

import type { Steps, StepsHandle } from './steps/mod.ts'
import { resolveSteps } from './steps/mod.ts'

import type { Accordion, AccordionHandle } from './accordion/mod.ts'
import { resolveAccordion } from './accordion/mod.ts'

import type { Block, BlockHandle } from './block/mod.ts'
import { resolveBlock } from './block/mod.ts'

import type { PanelContent } from './content.ts'

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
	modal?: (resolved: ResolvedModal, renderContent: (items: PanelContent[]) => HTMLElement[], onAction: (action: string) => void) => HTMLElement
	alert?: (resolved: ResolvedAlert) => HTMLElement
	tabs?: (handle: TabsHandle, renderContent: (items: PanelContent[]) => HTMLElement[]) => HTMLElement
	steps?: (handle: StepsHandle, renderContent: (items: PanelContent[]) => HTMLElement[], onComplete?: () => void) => HTMLElement
	accordion?: (handle: AccordionHandle, renderContent: (items: PanelContent[]) => HTMLElement[]) => HTMLElement
	block?: (handle: BlockHandle, renderContent: (items: PanelContent[]) => HTMLElement[]) => HTMLElement
}

// ============================================================
// Reactive DOM helpers (internal)
// ============================================================

function reactiveText(el: HTMLElement, fn: () => string): void {
	effect(() => { el.textContent = fn() })
}

function reactiveAttr(el: HTMLElement, attr: string, fn: () => string | boolean | undefined): void {
	effect(() => {
		const value = fn()
		if (typeof value === 'boolean') {
			if (value) el.setAttribute(attr, '')
			else el.removeAttribute(attr)
		} else if (value == null) {
			el.removeAttribute(attr)
		} else {
			el.setAttribute(attr, value)
		}
	})
}

function reactiveClass(el: HTMLElement, fn: () => string): void {
	effect(() => { el.className = fn() })
}

function reactiveDisplay(el: HTMLElement, fn: () => boolean): void {
	effect(() => { el.style.display = fn() ? '' : 'none' })
}

function reactiveDisabled(el: HTMLElement, fn: () => boolean): void {
	reactiveAttr(el, 'disabled', fn)
}


// ============================================================
// Default field input renderer
// ============================================================

function renderFieldInput(field: Field, binding: FieldBinding): HTMLElement {
	switch (field.type) {
		case 'select': {
			const el = select({ name: field.name })
			reactiveDisabled(el, () => binding.disabled)

			el.append(option({ value: '' }, field.placeholder ?? 'Select...'))
			for (const opt of field.options ?? []) {
				el.append(option({ value: String(opt.value) }, opt.label))
			}

			effect(() => { (el as HTMLSelectElement).value = String(binding.value ?? '') })
			el.addEventListener('change', (e) => binding.onChange((e.target as HTMLSelectElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'checkbox': {
			const el = input({ type: 'checkbox', name: field.name })
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).checked = !!binding.value })
			el.addEventListener('change', (e) => binding.onChange((e.target as HTMLInputElement).checked))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'radio': {
			const group = div({ class: 'radio-group' })
			for (const opt of field.options ?? []) {
				const radioInput = input({
					type: 'radio',
					name: field.name,
					value: String(opt.value),
				})
				reactiveDisabled(radioInput, () => binding.disabled)
				effect(() => { (radioInput as HTMLInputElement).checked = binding.value === opt.value })
				radioInput.addEventListener('change', () => binding.onChange(opt.value))
				radioInput.addEventListener('blur', () => binding.onBlur())

				group.append(label(null, radioInput, opt.label))
			}
			return group
		}

		case 'textarea': {
			const props: Record<string, unknown> = { name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = textarea(props as any)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLTextAreaElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => binding.onChange((e.target as HTMLTextAreaElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		case 'number': {
			const props: InputProps = { type: 'number', name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = input(props)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => {
				const v = (e.target as HTMLInputElement).value
				binding.onChange(v === '' ? undefined : Number(v))
			})
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}

		default: {
			const props: InputProps = { type: field.type, name: field.name }
			if (field.placeholder) props.placeholder = field.placeholder
			const el = input(props)
			reactiveDisabled(el, () => binding.disabled)
			effect(() => { (el as HTMLInputElement).value = String(binding.value ?? '') })
			el.addEventListener('input', (e) => binding.onChange((e.target as HTMLInputElement).value))
			el.addEventListener('blur', () => binding.onBlur())
			return el
		}
	}
}

// ============================================================
// Default action renderer
// ============================================================

function defaultActionRenderer(resolved: ResolvedAction): HTMLElement {
	if (resolved.href) {
		const el = a(
			{ href: resolved.href, class: `btn btn--${resolved.variant ?? 'default'}` },
			resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
			resolved.label,
		)
		reactiveDisplay(el, () => !resolved.hidden)
		return el
	}

	const el = button(
		{ type: 'button', class: `btn btn--${resolved.variant ?? 'default'}` },
		resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
		resolved.label,
	)
	reactiveDisplay(el, () => !resolved.hidden)
	reactiveDisabled(el, () => resolved.disabled || resolved.loading)
	el.addEventListener('click', resolved.execute)
	return el
}

function defaultActionGroupRenderer(
	resolved: ResolvedActionGroup,
	renderAction: (a: ResolvedAction) => HTMLElement
): HTMLElement {
	// No label — button row
	if (!resolved.label) {
		const wrapper = div({ class: 'action-group' })
		reactiveDisplay(wrapper, () => !resolved.hidden)
		for (const item of resolved.items) {
			wrapper.append(renderAction(item))
		}
		return wrapper
	}

	// With label — dropdown using useDropdown hook
	const trigger = button(
		{ type: 'button', class: 'dropdown-trigger' },
		resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
		resolved.label,
	)
	reactiveDisplay(trigger, () => !resolved.hidden)
	reactiveDisabled(trigger, () => resolved.disabled)

	const items: DropdownItem[] = resolved.items.map(item => ({
		label: item.label,
		value: item.action,
		disabled: item.disabled,
		onSelect: () => item.execute(),
	}))

	useDropdown(trigger, { items })

	return trigger
}

// ============================================================
// Factory
// ============================================================

export function createRenderer(config?: RendererConfig) {
	const overrides = config ?? {}

	// --- Action renderer (shared) ---

	function renderActionElement(resolved: ResolvedAction): HTMLElement {
		if (overrides.action) return overrides.action(resolved)
		return defaultActionRenderer(resolved)
	}

	// --- Form engine ---

	const formEngine = createFormEngine<HTMLElement>({
		field: (field, binding) => {
			if (overrides.fields?.[field.type]) {
				return overrides.fields[field.type](field, binding)
			}

			const wrapper = div({ class: 'field' })
			reactiveDisplay(wrapper, () => !binding.hidden)

			if (field.label) {
				wrapper.append(label({ for: field.name }, field.label))
			}

			wrapper.append(renderFieldInput(field, binding))

			if (field.hint) {
				wrapper.append(span({ class: 'field-hint' }, field.hint))
			}

			const errorEl = span({ class: 'field-error' })
			reactiveDisplay(errorEl, () => !!binding.error)
			reactiveText(errorEl, () => binding.error ?? '')
			wrapper.append(errorEl)

			return wrapper
		},

		group: overrides.group ?? ((group, children, binding) => {
			const el = fieldset()
			reactiveDisplay(el, () => !binding.hidden)
			reactiveDisabled(el, () => binding.disabled)

			if (group.label) {
				const legend = document.createElement('legend')
				legend.textContent = group.label
				el.append(legend)
			}

			for (const child of children) el.append(child)
			return el
		}),

		form: overrides.form ?? ((_, children) => {
			const wrapper = div({ class: 'form' })
			for (const child of children) wrapper.append(child)
			return wrapper
		}),

		repeater: overrides.repeater ?? ((repeater, rows, controls) => {
			const wrapper = div({ class: 'repeater' })

			if (repeater.label) {
				wrapper.append(label({ class: 'repeater-label' }, repeater.label))
			}

			for (const row of rows) {
				const rowEl = div({ class: 'repeater-row' })
				for (const field of row.fields) rowEl.append(field)

				if (row.remove) {
					const removeBtn = button({ type: 'button', class: 'repeater-remove' }, '×')
					removeBtn.addEventListener('click', row.remove)
					rowEl.append(removeBtn)
				}

				wrapper.append(rowEl)
			}

			if (controls.addRow) {
				const addBtn = button({ type: 'button', class: 'repeater-add' }, '+ Add')
				addBtn.addEventListener('click', controls.addRow)
				wrapper.append(addBtn)
			}

			return wrapper
		}),
	})

	// --- Table engine ---

	const tableEngine = createTableEngine<HTMLElement>({
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

	// --- renderForm ---

	function renderForm(form: Form, options?: FormRenderOptions): HTMLElement {
		const stateData = { ...collectDefaults(form.items), ...options?.state }
		const stateSignal = signal(stateData)
		const errorsSignal = signal<Record<string, string | undefined>>({})

		const stateProxy = new Proxy({} as Record<string, unknown>, {
			get: (_, key: string) => stateSignal.get()[key],
			set: (_, key: string, value: unknown) => {
				stateSignal.update(s => ({ ...s, [key]: value }))
				return true
			},
		})

		const errorsProxy = new Proxy({} as Record<string, string | undefined>, {
			get: (_, key: string) => errorsSignal.get()[key],
			set: (_, key: string, value: unknown) => {
				errorsSignal.update(e => ({ ...e, [key]: value as string | undefined }))
				return true
			},
		})

		return formEngine.render(form, {
			state: options?.state ?? stateProxy,
			errors: options?.errors ?? errorsProxy,
			onReady: options?.onReady,
		})
	}

	// --- renderTable ---

	function renderTable(table: Table, options: TableRenderOptions): HTMLElement {
		return tableEngine.render(table, {
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

	// --- renderAction ---

	function renderAction(action: Action, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveAction(action, { onAction: options?.onAction })
		return renderActionElement(resolved)
	}

	// --- renderActionGroup ---

	function renderActionGroup(group: ActionGroup, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveActionGroup(group, { onAction: options?.onAction })
		if (overrides.actionGroup) return overrides.actionGroup(resolved)
		return defaultActionGroupRenderer(resolved, renderActionElement)
	}

	// --- renderModal ---

	function renderModal(modal: Modal, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveModal(modal, options?.onAction)

		if (overrides.modal) {
			return overrides.modal(resolved, renderPanelContent, options?.onAction ?? (() => { }))
		}

		const contentWrapper = div({ class: 'modal-content' })

		// Header
		if (resolved.title) {
			const header = div({ class: 'modal-header' },
				h2(null, resolved.title),
			)
			contentWrapper.append(header)
		}

		// Body
		const body = div({ class: 'modal-body' })
		for (const child of renderPanelContent(resolved.content)) {
			body.append(child)
		}
		contentWrapper.append(body)

		// Footer
		if (resolved.footer.length > 0) {
			const footer = div({ class: 'modal-footer' })
			for (const action of resolved.footer) {
				footer.append(renderActionElement(action))
			}
			contentWrapper.append(footer)
		}

		const { open, close, isOpen } = useModal(
			() => contentWrapper,
			{
				closeOnBackdrop: resolved.closable,
				closeOnEscape: resolved.closable,
				onClose: () => options?.onAction?.(resolved.closeAction ?? 'close'),
			},
		)

		// Reactively open/close based on toggle
		effect(() => {
			const shouldShow = !resolved.hidden
			const currently = isOpen.get()
			if (shouldShow && !currently) open()
			if (!shouldShow && currently) close()
		})

		// Return a placeholder — the modal renders via portal
		const placeholder = div({ class: 'modal-anchor' })
		placeholder.dataset.modalTitle = resolved.title ?? ''
		return placeholder
	}

	// --- renderAlert ---

	function renderAlert(alert: Alert, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveAlert(alert, options?.onAction)
		if (overrides.alert) return overrides.alert(resolved)

		const wrapper = div({ class: `alert alert--${resolved.severity}`, role: 'alert' })
		reactiveDisplay(wrapper, () => !resolved.hidden)

		const msg = span({ class: 'alert-message' })
		reactiveText(msg, () => resolved.message)
		wrapper.append(msg)

		if (resolved.dismiss) {
			const btn = button({ type: 'button', class: 'alert-dismiss' }, '×')
			btn.addEventListener('click', resolved.dismiss)
			wrapper.append(btn)
		}

		return wrapper
	}

	// --- renderTabs ---

	function renderTabs(tabs: Tabs): HTMLElement {
		const handle = resolveTabs(tabs)
		if (overrides.tabs) return overrides.tabs(handle, renderPanelContent)

		const wrapper = div({ class: 'tabs' })

		const header = div({ class: 'tabs-header' })
		for (const tab of handle.tabs) {
			const btn = button({ type: 'button' }, tab.label)
			reactiveDisplay(btn, () => !tab.hidden)
			reactiveDisabled(btn, () => tab.disabled)
			reactiveClass(btn, () =>
				`tab-button${tab.active ? ' active' : ''}${tab.disabled ? ' disabled' : ''}`
			)
			btn.addEventListener('click', () => handle.setActive(tab.key))

			if (tab.icon) {
				btn.prepend(span({ class: 'tab-icon' }, tab.icon))
			}
			header.append(btn)
		}
		wrapper.append(header)

		for (const tab of handle.tabs) {
			const panel = div({ class: 'tab-panel' })
			reactiveDisplay(panel, () => tab.active)
			for (const child of renderPanelContent(tab.content)) {
				panel.append(child)
			}
			wrapper.append(panel)
		}

		return wrapper
	}

	// --- renderSteps ---

	function renderSteps(steps: Steps, options?: StepsRenderOptions): HTMLElement {
		const handle = resolveSteps(steps)
		if (overrides.steps) return overrides.steps(handle, renderPanelContent, options?.onComplete)

		const wrapper = div({ class: 'steps' })

		const header = div({ class: 'steps-header' })
		handle.steps.forEach((step, index) => {
			const btn = button({ type: 'button' })
			reactiveDisabled(btn, () => !step.accessible)
			reactiveClass(btn, () =>
				`step-indicator${step.active ? ' active' : ''}${step.visited ? ' visited' : ''}`
			)
			btn.addEventListener('click', () => handle.goTo(index))
			btn.append(
				span({ class: 'step-number' }, String(index + 1)),
				span({ class: 'step-label' }, step.label),
			)
			header.append(btn)
		})
		wrapper.append(header)

		for (const step of handle.steps) {
			const panel = div({ class: 'step-panel' })
			reactiveDisplay(panel, () => step.active)
			for (const child of renderPanelContent(step.content)) {
				panel.append(child)
			}
			wrapper.append(panel)
		}

		const nav = div({ class: 'steps-nav' })

		const backBtn = button({ type: 'button' }, '← Back')
		reactiveDisabled(backBtn, () => handle.isFirst)
		backBtn.addEventListener('click', () => handle.back())
		nav.append(backBtn)

		const nextBtn = button({ type: 'button' })
		reactiveText(nextBtn, () => handle.isLast ? 'Complete' : 'Next →')
		nextBtn.addEventListener('click', () => {
			if (handle.isLast) options?.onComplete?.()
			else handle.next()
		})
		nav.append(nextBtn)

		wrapper.append(nav)
		return wrapper
	}

	// --- renderAccordion ---

	function renderAccordion(accordion: Accordion): HTMLElement {
		const handle = resolveAccordion(accordion)
		if (overrides.accordion) return overrides.accordion(handle, renderPanelContent)

		const wrapper = div({ class: 'accordion' })

		for (const panel of handle.panels) {
			const section = div({ class: 'accordion-panel' })
			reactiveDisplay(section, () => !panel.hidden)

			const header = button({ class: 'accordion-header' })
			reactiveDisabled(header, () => panel.disabled)
			header.addEventListener('click', panel.toggle)

			if (panel.icon) {
				header.append(span({ class: 'accordion-icon' }, panel.icon))
			}
			header.append(span({ class: 'accordion-label' }, panel.label))

			const chevron = span({ class: 'accordion-chevron' })
			reactiveText(chevron, () => panel.open ? '▼' : '▶')
			header.append(chevron)

			section.append(header)

			const body = div({ class: 'accordion-body' })
			reactiveDisplay(body, () => panel.open)
			for (const child of renderPanelContent(panel.content)) {
				body.append(child)
			}
			section.append(body)

			wrapper.append(section)
		}

		return wrapper
	}

	// --- renderBlock ---

	function renderBlock(block: Block, options?: BlockRenderOptions): HTMLElement {
		const handle = resolveBlock(block, options?.onAction)
		if (overrides.block) return overrides.block(handle, renderPanelContent)

		const wrapper = div({ class: 'block' })
		reactiveDisplay(wrapper, () => !handle.hidden)
		reactiveClass(wrapper, () =>
			`block${handle.collapsed ? ' block--collapsed' : ''}${handle.loading ? ' block--loading' : ''}`
		)
		if (handle.id) wrapper.id = handle.id

		if (handle.title || handle.icon || handle.headerActions.length > 0) {
			const header = div({ class: 'block-header' })

			if (handle.icon) {
				header.append(span({ class: 'block-icon' }, handle.icon))
			}

			if (handle.title) {
				const titleEl = h3({ class: 'block-title' })
				reactiveText(titleEl, () => handle.title ?? '')
				if (handle.subtitle) {
					const sub = small()
					reactiveText(sub, () => handle.subtitle ?? '')
					titleEl.append(sub)
				}
				header.append(titleEl)
			}

			const opts = div({ class: 'block-options' })
			for (const action of handle.headerActions) {
				opts.append(renderActionElement(action))
			}

			const collapseBtn = button({ type: 'button', class: 'btn-block-option' })
			reactiveText(collapseBtn, () => handle.collapsed ? '▶' : '▼')
			collapseBtn.addEventListener('click', handle.toggleCollapse)
			opts.append(collapseBtn)

			header.append(opts)
			wrapper.append(header)
		}

		const content = div({ class: 'block-content' })
		reactiveDisplay(content, () => !handle.collapsed)
		for (const child of renderPanelContent(handle.content)) {
			content.append(child)
		}
		wrapper.append(content)

		const loader = div({ class: 'block-loader' })
		reactiveDisplay(loader, () => handle.loading)
		wrapper.append(loader)

		return wrapper
	}

	function renderPanelContent(
		items: PanelContent[],
		onFormReady?: (index: number, handle: FormHandle) => void
	): HTMLElement[] {
		return items.map((item, index) => {
			if (typeof item === 'string') return p(null, item)

			const typed = item as { type: string }

			switch (typed.type) {
				case 'form':
					return renderForm(item as Form, {
						onReady: (handle) => onFormReady?.(index, handle),
					})

				case 'alert':
					return renderAlert(item as Alert)

				case 'block':
					return renderBlock(item as Block)

				case 'text': {
					const display = item as { content: string | (() => string); variant?: string }
					const el = p({ class: `text text--${display.variant ?? 'body'}` })
					if (typeof display.content === 'function') {
						reactiveText(el, display.content)
					} else {
						el.textContent = display.content
					}
					return el
				}

				case 'badge': {
					const badge = item as { label: string | (() => string); variant?: string }
					const el = span({ class: `badge badge--${badge.variant ?? 'neutral'}` })
					if (typeof badge.label === 'function') {
						reactiveText(el, badge.label)
					} else {
						el.textContent = badge.label
					}
					return el
				}

				case 'image': {
					const image = item as { src: string | (() => string); alt: string; width?: number; height?: number }
					const props: Record<string, unknown> = { alt: image.alt }
					if (image.width) props.width = image.width
					if (image.height) props.height = image.height
					if (typeof image.src === 'string') props.src = image.src
					const el = img(props as any)
					if (typeof image.src === 'function') {
						reactiveAttr(el, 'src', image.src)
					}
					return el
				}

				default:
					return div(null, `[unsupported: ${typed.type}]`)
			}
		})
	}

	// --- Generic render ---

	function render(node: any, options?: any): HTMLElement {
		switch (node.type) {
			case 'form': return renderForm(node, options)
			case 'table': return renderTable(node, options)
			case 'action': return renderAction(node, options)
			case 'action-group': return renderActionGroup(node, options)
			case 'modal': return renderModal(node, options)
			case 'alert': return renderAlert(node, options)
			case 'tabs': return renderTabs(node)
			case 'steps': return renderSteps(node, options)
			case 'accordion': return renderAccordion(node)
			case 'block': return renderBlock(node, options)
			default:
				return div(null, `[unknown node: ${(node as any).type}]`)
		}
	}

	return {
		render,
		renderForm,
		renderTable,
		renderAction,
		renderActionGroup,
		renderModal,
		renderAlert,
		renderTabs,
		renderSteps,
		renderAccordion,
		renderBlock,
		renderPanelContent,
	}
}