import { resolveScope } from '../scope.ts'
import type { Scope } from '../scope.ts'
import { createPortal } from '../primitives/portal.ts'
import { computePosition } from '../primitives/position.ts'
import type { Placement } from '../primitives/position.ts'

export interface TooltipOptions {
	text: string
	placement?: Placement
	offset?: number
	showDelay?: number
	hideDelay?: number
	class?: string
}

export interface TooltipReturn {
	dispose: () => void
}

export function useTooltip(
	trigger: HTMLElement,
	options: TooltipOptions,
	scope?: Scope,
): TooltipReturn {
	const s = resolveScope(scope)
	const {
		text,
		placement = 'top',
		offset = 8,
		showDelay = 200,
		hideDelay = 100,
	} = options

	let tooltip: HTMLElement | null = null
	let portal: { element: HTMLElement; remove: () => void } | null = null
	let showTimer: number | undefined
	let hideTimer: number | undefined

	function create(): HTMLElement {
		const el = document.createElement('div')
		el.setAttribute('role', 'tooltip')
		if (options.class) el.className = options.class
		el.style.position = 'fixed'
		el.style.pointerEvents = 'none'
		el.textContent = text
		return el
	}

	function show(): void {
		if (hideTimer) { clearTimeout(hideTimer); hideTimer = undefined }
		if (tooltip) return
		showTimer = setTimeout(() => {
			tooltip = create()
			portal = createPortal(tooltip)
			const pos = computePosition(trigger, tooltip, { placement, offset })
			tooltip.style.top = `${pos.top}px`
			tooltip.style.left = `${pos.left}px`
		}, showDelay) as unknown as number
	}

	function hide(): void {
		if (showTimer) { clearTimeout(showTimer); showTimer = undefined }
		hideTimer = setTimeout(() => {
			portal?.remove()
			portal = null
			tooltip = null
		}, hideDelay) as unknown as number
	}

	trigger.addEventListener('mouseenter', show)
	trigger.addEventListener('mouseleave', hide)
	trigger.addEventListener('focus', show)
	trigger.addEventListener('blur', hide)

	function dispose(): void {
		if (showTimer) clearTimeout(showTimer)
		if (hideTimer) clearTimeout(hideTimer)
		trigger.removeEventListener('mouseenter', show)
		trigger.removeEventListener('mouseleave', hide)
		trigger.removeEventListener('focus', show)
		trigger.removeEventListener('blur', hide)
		portal?.remove()
		portal = null
		tooltip = null
	}

	s?.onCleanup(dispose)
	return { dispose }
}