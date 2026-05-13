import type { Node } from '../node.ts';

interface Action extends Node {
	type: 'action'
	label: string
	action?: string      // fires onAction — mutually exclusive with href
	href?: string         // navigates — mutually exclusive with action
	icon?: string
	variant?: string
	loading?: (context: Record<string, unknown>) => boolean
};

interface ActionGroup extends Node {
	type: 'action-group'
	label?: string        // if present, renders as dropdown/menu
	icon?: string
	items: Action[]
}

export type {
	Action,
	ActionGroup
};