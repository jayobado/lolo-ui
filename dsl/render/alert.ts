import { div, span, button } from '../../dom.ts'
import type { Alert } from '../alert-notification/mod.ts'
import { resolveAlert } from '../alert-notification/mod.ts'
import type { RendererConfig, ActionRenderOptions } from './types.ts'
import { reactiveDisplay, reactiveText } from './reactive.ts'

export function createAlertRenderer(overrides: RendererConfig) {
	return function renderAlert(alert: Alert, options?: ActionRenderOptions): HTMLElement {
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
}