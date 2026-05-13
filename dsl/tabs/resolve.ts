import type { Tabs, PanelContent } from './types.ts'

export interface ResolvedTab {
	key: string
	label: string
	icon?: string
	content: PanelContent[]
	readonly hidden: boolean
	readonly disabled: boolean
	readonly active: boolean
}

export interface TabsHandle {
	readonly activeKey: string
	setActive: (key: string) => void
	readonly tabs: ResolvedTab[]
}

export function resolveTabs(tabs: Tabs): TabsHandle {
	let activeKey = tabs.defaultTab ?? tabs.items[0]?.key

	const resolvedTabs = tabs.items.map((panel): ResolvedTab => {
		const content = Array.isArray(panel.content) ? panel.content : [panel.content]

		return {
			key: panel.key,
			label: panel.label,
			icon: panel.icon,
			content,
			get hidden() { return panel.toggle?.({}) === 'hide' },
			get disabled() { return panel.toggle?.({}) === 'disable' },
			get active() { return activeKey === panel.key },
		}
	})

	return {
		get activeKey() { return activeKey },
		setActive: (key: string) => {
			const tab = resolvedTabs.find(t => t.key === key)
			if (tab && !tab.hidden && !tab.disabled) {
				activeKey = key
			}
		},
		get tabs() { return resolvedTabs },
	}
}