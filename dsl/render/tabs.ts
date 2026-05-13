import { div, span, button } from '../../dom.ts'
import type { Tabs } from '../tabs/mod.ts'
import { resolveTabs } from '../tabs/mod.ts'
import type { RendererConfig, ContentRenderer } from './types.ts'
import { reactiveDisplay, reactiveDisabled, reactiveClass } from './reactive.ts'

export function createTabsRenderer(
	overrides: RendererConfig,
	renderPanelContent: ContentRenderer,
) {
	return function renderTabs(tabs: Tabs): HTMLElement {
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
}