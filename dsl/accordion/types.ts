import type { Node } from '../node'
import type { PanelContent } from '../content'

export interface AccordionPanel {
	key: string
	label: string
	icon?: string
	content: PanelContent | PanelContent[]
	toggle?: (context: Record<string, unknown>) => 'hide' | 'disable' | undefined
}

export interface Accordion extends Node {
	type: 'accordion'
	items: AccordionPanel[]
	multiple?: boolean
	defaultOpen?: string[]
}