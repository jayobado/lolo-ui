import type { Node } from '../node.ts';
import type { PanelContent } from '../content.ts';

interface TabPanel {
	key: string
	label: string
	icon?: string
	content: PanelContent | PanelContent[]
	toggle?: (context: Record<string, unknown>) => 'hide' | 'disable' | undefined
}

interface Tabs extends Node {
	type: 'tabs'
	defaultTab?: string
	items: TabPanel[]
}

export type { Tabs, TabPanel, PanelContent }