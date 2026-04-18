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

export interface RouteDefinition {
	path: string
	view?: (context: RouteContext) => HTMLElement
	redirect?: string | ((context: RouteContext) => string)
	layout?: (content: HTMLElement, context: RouteContext) => HTMLElement
	guards?: GuardFn[]
	meta?: Record<string, unknown>
	title?: string | ((context: RouteContext) => string)
}

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

// ─── createRouter ─────────────────────────────────────────────────────────────

export function createRouter(options: RouterOptions): Router {
	const { outlet, routes, onError, fallback, scrollToTop = true } = options

	const compiled = routes.map(route => ({
		route,
		regex: pathToRegex(route.path),
	}))

	let currentEl: HTMLElement | null = null

	function matchRoute(pathname: string) {
		for (const { route, regex } of compiled) {
			const match = pathname.match(regex)
			if (match) return { route, params: match.groups ?? {} as RouteParams }
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
			if (matched?.route.guards?.length) {
				const guardResult = await runGuards(matched.route.guards, context)
				if (guardResult !== true) {
					navigate(guardResult)
					return
				}
			}

			// ── Redirect ──────────────────────────────────────────────────────
			if (matched?.route.redirect) {
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

			if (!matched || !matched.route.view) {
				viewEl = fallback
					? fallback(context)
					: (() => {
						const el = document.createElement('div')
						el.textContent = '404 — Page not found'
						return el
					})()
			} else {
				const rawView = matched.route.view(context)
				viewEl = matched.route.layout
					? matched.route.layout(rawView, context)
					: rawView
			}

			outlet.appendChild(viewEl)
			currentEl = viewEl
			runMount(viewEl)

			if (matched?.route.title) {
				document.title = typeof matched.route.title === 'function'
					? matched.route.title(context)
					: matched.route.title
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

	// Set global navigate so views can use navigateTo()
	globalNavigate = navigate

	render(location.pathname, location.search)

	return { navigateTo: navigate, back, forward, interceptLinks }
}