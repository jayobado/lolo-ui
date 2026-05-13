import { effect } from '../../signals.ts'
import { div, h2 } from '../../dom.ts'
import { useModal } from '../../hooks/mod.ts'
import type { Modal } from '../modal/mod.ts'
import { resolveModal } from '../modal/mod.ts'
import type { ResolvedAction } from '../action/mod.ts'
import type { RendererConfig, ActionRenderOptions, ContentRenderer } from './types.ts'

export function createModalRenderer(
	overrides: RendererConfig,
	renderActionElement: (resolved: ResolvedAction) => HTMLElement,
	renderPanelContent: ContentRenderer,
) {
	return function renderModal(modal: Modal, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveModal(modal, options?.onAction)

		if (overrides.modal) {
			return overrides.modal(resolved, renderPanelContent, options?.onAction ?? (() => { }))
		}

		const contentWrapper = div({ class: 'modal-content' })

		if (resolved.title) {
			const header = div({ class: 'modal-header' },
				h2(null, resolved.title),
			)
			contentWrapper.append(header)
		}

		const body = div({ class: 'modal-body' })
		for (const child of renderPanelContent(resolved.content)) {
			body.append(child)
		}
		contentWrapper.append(body)

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

		effect(() => {
			const shouldShow = !resolved.hidden
			const currently = isOpen.get()
			if (shouldShow && !currently) open()
			if (!shouldShow && currently) close()
		})

		const placeholder = div({ class: 'modal-anchor' })
		placeholder.dataset.modalTitle = resolved.title ?? ''
		return placeholder
	}
}