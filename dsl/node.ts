type NodeType = 
	| "form"
	| "table"
	| "action"
	| "action-group"
	| "modal"
	| "alert"
	| "tabs"
	| "steps"
	| "accordion"
	| "block"


export interface Node {
	type: NodeType
	toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
};