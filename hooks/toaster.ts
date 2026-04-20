import { createPortal } from '../primitives/portal.ts'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
	duration?: number
	variant?: ToastVariant
	class?: string
	dismissible?: boolean
}

export interface ToasterOptions {
	containerClass?: string
	variantClass?: Partial<Record<ToastVariant, string>>
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
	if (opts.containerClass) container.className = opts.containerClass

	const portal = createPortal(container)

	function show(message: string, toastOpts?: ToastOptions): void {
		const {
			duration = 3000,
			variant = 'info',
			dismissible = true,
		} = toastOpts ?? {}

		const toast = document.createElement('div')
		toast.setAttribute('role', 'alert')

		const classes: string[] = []
		if (toastOpts?.class) classes.push(toastOpts.class)
		if (opts.variantClass?.[variant]) classes.push(opts.variantClass[variant]!)
		if (classes.length) toast.className = classes.join(' ')

		toast.textContent = message

		let timer: number | undefined

		function remove(): void {
			if (timer) clearTimeout(timer)
			if (toast.parentNode === container) {
				container.removeChild(toast)
			}
		}

		if (dismissible) {
			toast.style.cursor = 'pointer'
			toast.addEventListener('click', () => remove())
		}

		container.appendChild(toast)

		if (duration > 0) {
			timer = setTimeout(remove, duration) as unknown as number
		}
	}

	function dispose(): void {
		portal.remove()
	}

	return { show, dispose }
}