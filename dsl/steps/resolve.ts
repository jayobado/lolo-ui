import type { PanelContent } from '../tabs/types.ts'
import type { Steps } from './types.ts';

export interface ResolvedStep {
	key: string
	label: string
	content: PanelContent[]
	readonly active: boolean
	readonly visited: boolean
	readonly accessible: boolean
}

export interface StepsHandle {
	readonly activeIndex: number
	readonly activeKey: string
	readonly isFirst: boolean
	readonly isLast: boolean
	readonly steps: ResolvedStep[]
	next: () => void
	back: () => void
	goTo: (index: number) => void
}

export function resolveSteps(steps: Steps): StepsHandle {
	let activeIndex = 0
	const visited = new Set<number>([0])
	const linear = steps.linear ?? true

	const resolvedSteps = steps.items.map((panel, index): ResolvedStep => {
		const content = Array.isArray(panel.content) ? panel.content : [panel.content]

		return {
			key: panel.key,
			label: panel.label,
			content,
			get active() { return activeIndex === index },
			get visited() { return visited.has(index) },
			get accessible() {
				if (!linear) return visited.has(index)
				return index <= Math.max(...visited)
			},
		}
	})

	return {
		get activeIndex() { return activeIndex },
		get activeKey() { return steps.items[activeIndex]?.key },
		get isFirst() { return activeIndex === 0 },
		get isLast() { return activeIndex === steps.items.length - 1 },
		get steps() { return resolvedSteps },

		next: () => {
			if (activeIndex < steps.items.length - 1) {
				activeIndex++
				visited.add(activeIndex)
			}
		},

		back: () => {
			if (activeIndex > 0) {
				activeIndex--
			}
		},

		goTo: (index: number) => {
			if (index < 0 || index >= steps.items.length) return
			if (linear && !visited.has(index) && index > Math.max(...visited)) return
			activeIndex = index
			visited.add(index)
		},
	}
}