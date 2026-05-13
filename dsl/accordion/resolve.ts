import type { PanelContent } from '../content.ts'
import type { Accordion } from './types.ts'

export interface ResolvedAccordionPanel {
	key: string
	label: string
	icon?: string
	content: PanelContent[]
	readonly hidden: boolean
	readonly disabled: boolean
	readonly open: boolean
	toggle: () => void
}

export interface AccordionHandle {
	readonly panels: ResolvedAccordionPanel[]
	open: (key: string) => void
	close: (key: string) => void
	togglePanel: (key: string) => void
}

export function resolveAccordion(accordion: Accordion): AccordionHandle {
	const openKeys = new Set<string>(accordion.defaultOpen ?? [])
	const multiple = accordion.multiple ?? true

	const resolvedPanels = accordion.items.map((panel): ResolvedAccordionPanel => {
		const content = Array.isArray(panel.content) ? panel.content : [panel.content]

		return {
			key: panel.key,
			label: panel.label,
			icon: panel.icon,
			content,
			get hidden() { return panel.toggle?.({}) === 'hide' },
			get disabled() { return panel.toggle?.({}) === 'disable' },
			get open() { return openKeys.has(panel.key) },
			toggle: () => {
				if (panel.toggle?.({}) === 'disable') return

				if (openKeys.has(panel.key)) {
					openKeys.delete(panel.key)
				} else {
					if (!multiple) openKeys.clear()
					openKeys.add(panel.key)
				}
			},
		}
	})

	return {
		get panels() { return resolvedPanels },
		open: (key: string) => {
			const panel = resolvedPanels.find(p => p.key === key)
			if (panel && !panel.hidden && !panel.disabled) {
				if (!multiple) openKeys.clear()
				openKeys.add(key)
			}
		},
		close: (key: string) => {
			openKeys.delete(key)
		},
		togglePanel: (key: string) => {
			const panel = resolvedPanels.find(p => p.key === key)
			if (panel) panel.toggle()
		},
	}
}