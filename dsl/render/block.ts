import { div, span, h3, small, button } from '../../dom.ts'
import type { Block } from '../block/mod.ts'
import { resolveBlock } from '../block/mod.ts'
import type { ResolvedAction } from '../action/mod.ts'
import type { RendererConfig, BlockRenderOptions, ContentRenderer } from './types.ts'
import { reactiveDisplay, reactiveClass, reactiveText } from './reactive.ts'

export function createBlockRenderer(
	overrides: RendererConfig,
	renderActionElement: (resolved: ResolvedAction) => HTMLElement,
	renderPanelContent: ContentRenderer,
) {
	return function renderBlock(block: Block, options?: BlockRenderOptions): HTMLElement {
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
}