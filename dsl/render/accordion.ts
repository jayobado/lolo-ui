import { div, span, button } from '../../dom.ts'
import type { Accordion } from '../accordion/mod.ts'
import { resolveAccordion } from '../accordion/mod.ts'
import type { RendererConfig, ContentRenderer } from './types.ts'
import { reactiveDisplay, reactiveDisabled, reactiveText } from './reactive.ts'

export function createAccordionRenderer(
	overrides: RendererConfig,
	renderPanelContent: ContentRenderer,
) {
	return function renderAccordion(accordion: Accordion): HTMLElement {
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
}