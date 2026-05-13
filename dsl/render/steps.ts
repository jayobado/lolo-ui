import { div, span, button } from '../../dom.ts'
import type { Steps } from '../steps/mod.ts'
import { resolveSteps } from '../steps/mod.ts'
import type { RendererConfig, StepsRenderOptions, ContentRenderer } from './types.ts'
import { reactiveDisplay, reactiveDisabled, reactiveClass, reactiveText } from './reactive.ts'

export function createStepsRenderer(
	overrides: RendererConfig,
	renderPanelContent: ContentRenderer,
) {
	return function renderSteps(steps: Steps, options?: StepsRenderOptions): HTMLElement {
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
}