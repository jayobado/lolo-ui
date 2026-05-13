import { span, button, a, div } from '../../dom.ts'
import { useDropdown } from '../../hooks/dropdown.ts'
import type { DropdownItem } from '../../hooks/dropdown.ts'
import type { ResolvedAction, ResolvedActionGroup } from '../action/mod.ts'
import { reactiveDisplay, reactiveDisabled } from './reactive.ts'

export function defaultActionRenderer(resolved: ResolvedAction): HTMLElement {
	if (resolved.href) {
		const el = a(
			{ href: resolved.href, class: `btn btn--${resolved.variant ?? 'default'}` },
			resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
			resolved.label,
		)
		reactiveDisplay(el, () => !resolved.hidden)
		return el
	}

	const el = button(
		{ type: 'button', class: `btn btn--${resolved.variant ?? 'default'}` },
		resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
		resolved.label,
	)
	reactiveDisplay(el, () => !resolved.hidden)
	reactiveDisabled(el, () => resolved.disabled || resolved.loading)
	el.addEventListener('click', resolved.execute)
	return el
}

export function defaultActionGroupRenderer(
	resolved: ResolvedActionGroup,
	renderAction: (a: ResolvedAction) => HTMLElement
): HTMLElement {
	if (!resolved.label) {
		const wrapper = div({ class: 'action-group' })
		reactiveDisplay(wrapper, () => !resolved.hidden)
		for (const item of resolved.items) {
			wrapper.append(renderAction(item))
		}
		return wrapper
	}

	const trigger = button(
		{ type: 'button', class: 'dropdown-trigger' },
		resolved.icon ? span({ class: 'btn-icon' }, resolved.icon) : false,
		resolved.label,
	)
	reactiveDisplay(trigger, () => !resolved.hidden)
	reactiveDisabled(trigger, () => resolved.disabled)

	const items: DropdownItem[] = resolved.items.map(item => ({
		label: item.label,
		value: item.action,
		disabled: item.disabled,
		onSelect: () => item.execute(),
	}))

	useDropdown(trigger, { items })

	return trigger
}