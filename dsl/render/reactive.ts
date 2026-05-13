import { effect } from '../../signals.ts';

export function reactiveText(el: HTMLElement, fn: () => string): void {
	effect(() => { el.textContent = fn() })
}

export function reactiveAttr(el: HTMLElement, attr: string, fn: () => string | boolean | undefined): void {
	effect(() => {
		const value = fn()
		if (typeof value === 'boolean') {
			if (value) el.setAttribute(attr, '')
			else el.removeAttribute(attr)
		} else if (value == null) {
			el.removeAttribute(attr)
		} else {
			el.setAttribute(attr, value)
		}
	})
}

export function reactiveClass(el: HTMLElement, fn: () => string): void {
	effect(() => { el.className = fn() })
}

export function reactiveDisplay(el: HTMLElement, fn: () => boolean): void {
	effect(() => { el.style.display = fn() ? '' : 'none' })
}

export function reactiveDisabled(el: HTMLElement, fn: () => boolean): void {
	reactiveAttr(el, 'disabled', fn)
}
