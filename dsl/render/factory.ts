import { div } from '../../dom.ts'
import type { Form } from '../form/mod.ts'
import type { Table } from '../table/mod.ts'
import type { Action, ActionGroup } from '../action/mod.ts'
import type { Modal } from '../modal/mod.ts'
import type { Alert } from '../alert-notification/mod.ts'
import type { Tabs } from '../tabs/mod.ts'
import type { Steps } from '../steps/mod.ts'
import type { Accordion } from '../accordion/mod.ts'
import type { Block } from '../block/mod.ts'
import type { ResolvedAction, ResolvedActionGroup } from '../action/mod.ts'
import { resolveAction, resolveActionGroup } from '../action/mod.ts'

import type {
	RendererConfig,
	FormRenderOptions,
	TableRenderOptions,
	ActionRenderOptions,
	StepsRenderOptions,
	BlockRenderOptions,
} from './types.ts'

import { defaultActionRenderer, defaultActionGroupRenderer } from './action.ts'
import { createFormRenderer } from './form.ts'
import { createTableRenderer } from './table.ts'
import { createModalRenderer } from './modal.ts'
import { createAlertRenderer } from './alert.ts'
import { createTabsRenderer } from './tabs.ts'
import { createStepsRenderer } from './steps.ts'
import { createAccordionRenderer } from './accordion.ts'
import { createBlockRenderer } from './block.ts'
import { createContentRenderer } from './content.ts'

export function createRenderer(config?: RendererConfig) {
	const overrides = config ?? {}

	// --- Action element renderer (shared dependency) ---

	function renderActionElement(resolved: ResolvedAction): HTMLElement {
		if (overrides.action) return overrides.action(resolved)
		return defaultActionRenderer(resolved)
	}

	// --- Form and alert (no circular deps) ---

	const renderForm = createFormRenderer(overrides)
	const renderAlert = createAlertRenderer(overrides)

	// --- Block needs content, content needs form + alert + block ---
	// Break the cycle: block renderer is created with a lazy content reference

	let renderPanelContent: ReturnType<typeof createContentRenderer>

	const renderBlock = createBlockRenderer(
		overrides,
		renderActionElement,
		(...args) => renderPanelContent(...args),
	)

	// Now content can reference all three
	renderPanelContent = createContentRenderer(renderForm, renderAlert, renderBlock)

	// --- Containers that depend on content ---

	const renderModal = createModalRenderer(overrides, renderActionElement, renderPanelContent)
	const renderTabs = createTabsRenderer(overrides, renderPanelContent)
	const renderSteps = createStepsRenderer(overrides, renderPanelContent)
	const renderAccordion = createAccordionRenderer(overrides, renderPanelContent)

	// --- Table (independent) ---

	const renderTable = createTableRenderer(overrides)

	// --- Action (thin wrappers over resolver + renderActionElement) ---

	function renderAction(action: Action, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveAction(action, { onAction: options?.onAction })
		return renderActionElement(resolved)
	}

	function renderActionGroup(group: ActionGroup, options?: ActionRenderOptions): HTMLElement {
		const resolved = resolveActionGroup(group, { onAction: options?.onAction })
		if (overrides.actionGroup) return overrides.actionGroup(resolved)
		return defaultActionGroupRenderer(resolved, renderActionElement)
	}

	// --- Generic render ---

	function render(node: any, options?: any): HTMLElement {
		switch (node.type) {
			case 'form': return renderForm(node, options)
			case 'table': return renderTable(node, options)
			case 'action': return renderAction(node, options)
			case 'action-group': return renderActionGroup(node, options)
			case 'modal': return renderModal(node, options)
			case 'alert': return renderAlert(node, options)
			case 'tabs': return renderTabs(node)
			case 'steps': return renderSteps(node, options)
			case 'accordion': return renderAccordion(node)
			case 'block': return renderBlock(node, options)
			default:
				return div(null, `[unknown node: ${(node as any).type}]`)
		}
	}

	return {
		render,
		renderForm,
		renderTable,
		renderAction,
		renderActionGroup,
		renderModal,
		renderAlert,
		renderTabs,
		renderSteps,
		renderAccordion,
		renderBlock,
		renderPanelContent,
	}
}

// ============================================================
// Default instance
// ============================================================

const defaultRenderer = createRenderer()

export const render = defaultRenderer.render
export const renderForm = defaultRenderer.renderForm
export const renderTable = defaultRenderer.renderTable
export const renderAction = defaultRenderer.renderAction
export const renderActionGroup = defaultRenderer.renderActionGroup
export const renderModal = defaultRenderer.renderModal
export const renderAlert = defaultRenderer.renderAlert
export const renderTabs = defaultRenderer.renderTabs
export const renderSteps = defaultRenderer.renderSteps
export const renderAccordion = defaultRenderer.renderAccordion
export const renderBlock = defaultRenderer.renderBlock
export const renderPanelContent = defaultRenderer.renderPanelContent
