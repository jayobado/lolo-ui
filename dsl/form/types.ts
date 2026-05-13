import type { Node } from '../node.ts';

type RuleValue<T> = T | { value: T; message: string };

interface ValidationRules {
	required?: RuleValue<boolean>
	minLength?: RuleValue<number>
	maxLength?: RuleValue<number>
	min?: RuleValue<number>
	max?: RuleValue<number>
	pattern?: RuleValue<string>
	match?: RuleValue<string>
	custom?: (value: unknown, state: Record<string, unknown>) => string | undefined
};

type FieldType =
	| "text"
	| "number"
	| "select"
	| "checkbox"
	| "radio"
	| "textarea"
	| "date"
	| "email"
	| "password"
	| (string & {});

type ValidateOn = 'change' | 'blur' | 'submit';

interface Option {
	label: string;
	value: string | number | boolean;
};

interface Field {
	name: string;
	type: FieldType;
	label?: string;
	placeholder?: string;
	hint?: string;
	options?: Option[];
	validateOn?: ValidateOn;
	rules?: ValidationRules;
	default?: string | number | boolean;
	toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
};

interface Repeater {
	repeater: string
	label?: string
	template: Item[]
	addable?: boolean
	removable?: boolean
	min?: number
	max?: number
	toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
};

type Item = Field | FieldGroup | Repeater;

interface FieldGroup {
	group: string      // key
	items: Item[]
	label?: string
	toggle?: (state: Record<string, unknown>) => 'hide' | 'disable' | undefined
};

interface Form extends Node {
	type: 'form'
	items: Item[]
	validateOn?: ValidateOn
	onSubmit: (state: Record<string, unknown>) => void | Promise<void>
};

interface FieldBinding {
	readonly value: unknown
	readonly error: string | undefined
	readonly disabled: boolean
	readonly hidden: boolean
	onChange: (value: unknown) => void
	onBlur: () => void
}

interface GroupBinding {
	readonly disabled: boolean
	readonly hidden: boolean
}

interface ValidateContext {
	trigger: ValidateOn
	field?: Field
}

interface FormHandle {
	submit: () => void
}

interface RepeaterRow<Element> {
	index: number
	fields: Element[]
	remove?: () => void
}

interface RepeaterControls {
	addRow?: () => void
	canAdd: boolean
	canRemove: boolean
}

type FieldHandler<Element> = (field: Field, binding: FieldBinding) => Element

type GroupHandler<Element> = (group: FieldGroup, children: Element[], binding: GroupBinding) => Element

type FormHandler<Element> = (form: Form, children: Element[]) => Element

type RepeaterHandler<Element> = (
	repeater: Repeater,
	rows: RepeaterRow<Element>[],
	controls: RepeaterControls
) => Element

export type {
	Field,
	Option,
	Item,
	FieldGroup,
	Form,
	ValidateOn,
	FieldBinding,
	GroupBinding,
	ValidateContext,
	FieldHandler,
	GroupHandler,
	FormHandler,
	FormHandle,
	Repeater,
	RepeaterRow,
	RepeaterControls,
	RepeaterHandler,
};