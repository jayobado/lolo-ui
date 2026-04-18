import { runMount, runUnmount } from './component.ts'

export interface RouteParams { [key: string]: string }
export interface QueryParams { [key: string]: string }

export interface RouteContext {
	params: RouteParams
	query: QueryParams
	path: string
}

export type GuardFn = (
	context: RouteContext
) => boolean | string | Promise<boolean | string>

interface RouteBase {
	guards?: GuardFn[]
	meta?: Record<string, unknown>
}

export interface RedirectRoute extends RouteBase {
	path: string
	redirect: string | ((context: RouteContext) => string)
}

export interface ViewRoute extends RouteBase {
	path: string
	title?: string | ((context: RouteContext) => string)
	view: (context: RouteContext) => HTMLElement
}

export interface LayoutRoute extends RouteBase {
	layout: (content: HTMLElement, context: RouteContext) => HTMLElement
	children: RouteDefinition[]
	path?: string
}

export type RouteDefinition = RedirectRoute | ViewRoute | LayoutRoute

function pathToRegex(path: string): RegExp {
	const pattern = path
		.replace(/\//g, '\\/')
		.replace(/:([^/]+)/g, '(?<$1>[^/]+)')
	return new RegExp(`^${pattern}$`)
}

function extractQuery(search: string): QueryParams {
	const params: QueryParams = {}
	new URLSearchParams(search).forEach((value, key) => { params[key] = value })
	return params
}

export interface RouterOptions {
	outlet: HTMLElement
	routes: RouteDefinition[]
	onError?: (err: unknown) => void
	fallback?: (context: RouteContext) => HTMLElement
	scrollToTop?: boolean
	appName?: string
}

export interface Router {
	navigateTo: (path: string) => void
	back: () => void
	forward: () => void
	interceptLinks: () => void
}

// ─── Global navigate ──────────────────────────────────────────────────────────

let globalNavigate: ((path: string) => void) | null = null

export function navigateTo(path: string): void {
	if (!globalNavigate) {
		throw new Error('[router] No router initialized. Call createApp().init() first.')
	}
	globalNavigate(path)
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isRedirect(route: RouteDefinition): route is RedirectRoute {
	return 'redirect' in route
}

function isLayout(route: RouteDefinition): route is LayoutRoute {
	return 'layout' in route
}

function isView(route: RouteDefinition): route is ViewRoute {
	return 'view' in route
}

// ─── Flatten routes ───────────────────────────────────────────────────────────

interface FlatRoute {
	regex: RegExp
	route: RedirectRoute | ViewRoute
	layout?: LayoutRoute['layout']
	guards: GuardFn[]
}

function flattenRoutes(
	routes: RouteDefinition[],
	parentLayout?: LayoutRoute['layout'],
	parentGuards: GuardFn[] = [],
	parentPath: string = '',
): FlatRoute[] {
	const flat: FlatRoute[] = []

	for (const route of routes) {
		const guards = [...parentGuards, ...(route.guards ?? [])]

		if (isLayout(route)) {
			const base = parentPath + (route.path ?? '')
			flat.push(...flattenRoutes(route.children, route.layout, guards, base))
		} else {
			const fullPath = parentPath + route.path
			flat.push({
				regex: pathToRegex(fullPath),
				route: { ...route, path: fullPath },
				layout: parentLayout,
				guards,
			})
		}
	}
	return flat
}

// ─── createRouter ─────────────────────────────────────────────────────────────

export function createRouter(options: RouterOptions): Router {
	const { outlet, appName, routes, onError, fallback, scrollToTop = true } = options

	const compiled = flattenRoutes(routes)

	let currentEl: HTMLElement | null = null

	function matchRoute(pathname: string) {
		for (const entry of compiled) {
			const match = pathname.match(entry.regex)
			if (match) return { ...entry, params: match.groups ?? {} as RouteParams }
		}
		return null
	}

	async function runGuards(
		guards: GuardFn[],
		context: RouteContext
	): Promise<true | string> {
		for (const guard of guards) {
			const result = await guard(context)
			if (result === false) return '/login'
			if (typeof result === 'string') return result
		}
		return true
	}

	async function render(pathname: string, search = ''): Promise<void> {
		const matched = matchRoute(pathname)
		const context: RouteContext = {
			params: matched?.params ?? {},
			query: extractQuery(search),
			path: pathname,
		}

		try {
			if (matched?.guards.length) {
				const guardResult = await runGuards(matched.guards, context)
				if (guardResult !== true) {
					navigate(guardResult)
					return
				}
			}

			// ── Redirect ──────────────────────────────────────────────────
			if (matched && isRedirect(matched.route)) {
				const target = typeof matched.route.redirect === 'function'
					? matched.route.redirect(context)
					: matched.route.redirect
				navigate(target)
				return
			}

			if (currentEl) {
				runUnmount(currentEl)
				currentEl.remove()
				currentEl = null
			}

			let viewEl: HTMLElement

			if (!matched || !isView(matched.route)) {
				viewEl = fallback
					? fallback(context)
					: (() => {
						const el = document.createElement('div')
						el.textContent = '404 — Page not found'
						return el
					})()
			} else {
				const rawView = matched.route.view(context)
				viewEl = matched.layout
					? matched.layout(rawView, context)
					: rawView
			}

			outlet.appendChild(viewEl)
			currentEl = viewEl
			runMount(viewEl)

			if (matched && isView(matched.route) && matched.route.title) {
				const viewTitle = typeof matched.route.title === 'function'
					? matched.route.title(context)
					: matched.route.title
				document.title = appName ? `${viewTitle} - ${appName}` : viewTitle
			}

			if (scrollToTop) globalThis.scrollTo(0, 0)

		} catch (err) {
			onError ? onError(err) : console.error('[router]', err)
		}
	}

	function navigate(url: string): void {
		history.pushState(null, '', url)
		const { pathname, search } = new URL(url, location.origin)
		render(pathname, search)
	}

	function back(): void { history.back() }
	function forward(): void { history.forward() }

	function interceptLinks(root: HTMLElement | Document = document): void {
		root.addEventListener('click', (e) => {
			const target = (e.target as Element).closest('a')
			if (!target) return
			const href = target.getAttribute('href')
			if (!href || href.startsWith('http') || href.startsWith('//')) return
			e.preventDefault()
			navigate(href)
		})
	}

	self.addEventListener('popstate', () => {
		render(location.pathname, location.search)
	})

	globalNavigate = navigate

	render(location.pathname, location.search)

	return { navigateTo: navigate, back, forward, interceptLinks }
}