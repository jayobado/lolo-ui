import { signal } from '../signals.ts'
import { css } from '../css.ts'
import type { StyleObject } from '../css.ts'
import { resolveScope } from '../scope.ts'
import type { Scope } from '../scope.ts'
import { createPortal } from '../primitives/portal.ts'
import { useClickOutside } from '../primitives/click-outside.ts'
import { useEscapeKey } from '../primitives/escape-key.ts'
import { computePosition } from '../primitives/position.ts'
import type { Placement } from '../primitives/position.ts'

export interface DropdownItem {
	label: string
	value?: string
	disabled?: boolean
	onSelect?: () => void
}

export interface DropdownOptions {
	items: DropdownItem[]
	placement?: Placement
	offset?: number
	class?: string
	styles?: StyleObject
	itemClass?: string
	itemStyles?: StyleObject
	activeItemStyles?: StyleObject
	disabledItemStyles?: StyleObject
	onSelect?: (item: DropdownItem) => void
}

export interface DropdownReturn {
	open: () => void
	close: () => void
	toggle: () => void
	isOpen: { get: () => boolean }
	dispose: () => void
}

export function useDropdown(
	trigger: HTMLElement,
	options: DropdownOptions,
	scope?: Scope,
): DropdownReturn {
	const s = resolveScope(scope)
	const isOpen = signal(false)
	const {
		items,
		placement = 'bottom',
		offset = 4,
	} = options

	let menu: HTMLElement | null = null
	let portal: { element: HTMLElement; remove: () => void } | null = null
	let activeIndex = -1
	let cleanups: Array<() => void> = []

	function getSelectableIndices(): number[] {
		return items.reduce<number[]>((acc, item, i) => {
			if (!item.disabled) acc.push(i)
			return acc
		}, [])
	}

	function updateActive(index: number): void {
		if (!menu) return
		const children = Array.from(menu.children) as HTMLElement[]
		children.forEach((child, i) => {
			if (i === index) {
				child.setAttribute('aria-selected', 'true')
				if (options.activeItemStyles) {
					child.className = [
						options.itemClass ?? '',
						options.itemStyles ? css(options.itemStyles) : '',
						css(options.activeItemStyles),
					].filter(Boolean).join(' ')
				}
			} else {
				child.removeAttribute('aria-selected')
				const classes: string[] = []
				if (options.itemClass) classes.push(options.itemClass)
				if (options.itemStyles) classes.push(css(options.itemStyles))
				if (items[i].disabled && options.disabledItemStyles) {
					classes.push(css(options.disabledItemStyles))
				}
				child.className = classes.join(' ')
			}
		})
		activeIndex = index
	}

	function selectItem(item: DropdownItem): void {
		if (item.disabled) return
		item.onSelect?.()
		options.onSelect?.(item)
		close()
	}

	function createMenu(): HTMLElement {
		const el = document.createElement('div')
		el.setAttribute('role', 'listbox')
		el.style.position = 'fixed'

		const classes: string[] = []
		if (options.class) classes.push(options.class)
		if (options.styles) classes.push(css(options.styles))
		if (classes.length) el.className = classes.join(' ')

		items.forEach((item, i) => {
			const row = document.createElement('div')
			row.setAttribute('role', 'option')
			row.textContent = item.label

			const rowClasses: string[] = []
			if (options.itemClass) rowClasses.push(options.itemClass)
			if (options.itemStyles) rowClasses.push(css(options.itemStyles))
			if (item.disabled && options.disabledItemStyles) {
				rowClasses.push(css(options.disabledItemStyles))
			}
			if (rowClasses.length) row.className = rowClasses.join(' ')

			if (!item.disabled) {
				row.style.cursor = 'pointer'
				row.addEventListener('click', () => selectItem(item))
				row.addEventListener('mouseenter', () => updateActive(i))
			}

			el.appendChild(row)
		})

		return el
	}

	function onKeydown(e: KeyboardEvent): void {
		if (!isOpen.get()) return
		const selectable = getSelectableIndices()
		if (!selectable.length) return

		switch (e.key) {
			case 'ArrowDown': {
				e.preventDefault()
				const currentPos = selectable.indexOf(activeIndex)
				const next = currentPos < selectable.length - 1 ? selectable[currentPos + 1] : selectable[0]
				updateActive(next)
				break
			}
			case 'ArrowUp': {
				e.preventDefault()
				const currentPos = selectable.indexOf(activeIndex)
				const prev = currentPos > 0 ? selectable[currentPos - 1] : selectable[selectable.length - 1]
				updateActive(prev)
				break
			}
			case 'Enter': {
				e.preventDefault()
				if (activeIndex >= 0) selectItem(items[activeIndex])
				break
			}
		}
	}

	function open(): void {
		if (isOpen.get()) return
		isOpen.set(true)
		activeIndex = -1

		menu = createMenu()
		portal = createPortal(menu)

		const pos = computePosition(trigger, menu, { placement, offset })
		menu.style.top = `${pos.top}px`
		menu.style.left = `${pos.left}px`

		cleanups.push(useClickOutside(() => menu, close))
		cleanups.push(useEscapeKey(close))
		document.addEventListener('keydown', onKeydown)
		cleanups.push(() => document.removeEventListener('keydown', onKeydown))
	}

	function close(): void {
		if (!isOpen.get()) return
		isOpen.set(false)
		activeIndex = -1

		cleanups.forEach(fn => fn())
		cleanups = []
		portal?.remove()
		portal = null
		menu = null

		trigger.focus()
	}

	function toggle(): void {
		isOpen.get() ? close() : open()
	}

	function dispose(): void {
		close()
	}

	s?.onCleanup(dispose)
	return { open, close, toggle, isOpen, dispose }
}