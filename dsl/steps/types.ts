import type { Node } from '../node.ts';
import type { PanelContent } from '../content.ts';

interface StepPanel {
	key: string
	label: string
	content: PanelContent | PanelContent[]
}

interface Steps extends Node {
	type: 'steps'
	linear?: boolean
	items: StepPanel[]
}

export type { Steps, StepPanel }