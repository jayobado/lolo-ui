import { div, span, p, img } from '../../dom.ts'
import type { Form, FormHandle } from '../form/mod.ts'
import type { Alert } from '../alert-notification/mod.ts'
import type { Block } from '../block/mod.ts'
import type { PanelContent } from '../content.ts'
import { reactiveText, reactiveAttr } from './reactive.ts'

export function createContentRenderer(
	renderForm: (form: Form, options?: { onReady?: (handle: FormHandle) => void }) => HTMLElement,
	renderAlert: (alert: Alert) => HTMLElement,
	renderBlock: (block: Block) => HTMLElement,
) {
	return function renderPanelContent(
		items: PanelContent[],
		onFormReady?: (index: number, handle: FormHandle) => void,
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
}