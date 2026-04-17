import { css } from '../css.ts'
import type { StyleObject } from '../css.ts'
import { createPortal } from '../primitives/portal.ts'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
	duration?: number
	variant?: ToastVariant
	class?: string
	styles?: StyleObject
	dismissible?: boolean
}

export interface ToasterOptions {
	containerClass?: string
	containerStyles?: StyleObject
	variantStyles?: Partial<Record<ToastVariant, StyleObject>>
}

export interface Toaster {
	show: (message: string, options?: ToastOptions) => void
	dispose: () => void
}

export function useToaster(options?: ToasterOptions): Toaster {
	const opts = options ?? {}

	const container = document.createElement('div')
	container.setAttribute('aria-live', 'polite')
	container.setAttribute('role', 'status')

	const containerClasses: string[] = []
	if (opts.containerClass) containerClasses.push(opts.containerClass)
	if (opts.containerStyles) containerClasses.push(css(opts.containerStyles))
	if (containerClasses.length) container.className = containerClasses.join(' ')

	const portal = createPortal(container)

	function show(message: string, toastOpts?: ToastOptions): void {
		const {
			duration = 3000,
			variant = 'info',
			dismissible = true,
		} = toastOpts ?? {}

		const toast = document.createElement('div')
		toast.setAttribute('role', 'alert')

		const toastClasses: string[] = []
		if (toastOpts?.class) toastClasses.push(toastOpts.class)
		if (toastOpts?.styles) toastClasses.push(css(toastOpts.styles))
		if (opts.variantStyles?.[variant]) toastClasses.push(css(opts.variantStyles[variant]!))
		if (toastClasses.length) toast.className = toastClasses.join(' ')

		toast.textContent = message

		if (dismissible) {
			toast.style.cursor = 'pointer'
			toast.addEventListener('click', () => remove())
		}

		container.appendChild(toast)

		let timer: number | undefined

		function remove(): void {
			if (timer) clearTimeout(timer)
			if (toast.parentNode === container) {
				container.removeChild(toast)
			}
		}

		if (duration > 0) {
			timer = setTimeout(remove, duration) as unknown as number
		}
	}

	function dispose(): void {
		portal.remove()
	}

	return { show, dispose }
}