import { createRouter } from './router.ts'
import type { RouteDefinition, RouterOptions } from './router.ts'

export interface AppOptions {
	name?: string
	favicon?: string
	mountPoint?: string | HTMLElement
	routes: RouteDefinition[]
	fallback?: RouterOptions['fallback']
	onError?: (err: unknown) => void
}

export interface App {
	use: (plugin: (app: App) => void) => App
	onInit: (fn: () => void | Promise<void>) => App
	init: () => Promise<void>
	mount: () => void
}

export function createApp(options: AppOptions): App {
	const { name, favicon, mountPoint = '#app', routes, fallback, onError } = options
	const initFns: Array<() => void | Promise<void>> = []
	const plugins: Array<(app: App) => void> = []

	const app: App = {
		use(plugin) {
			plugins.push(plugin)
			return app
		},

		onInit(fn) {
			initFns.push(fn)
			return app
		},

		async init() {
			const outletElement = typeof mountPoint === 'string'
				? document.querySelector<HTMLElement>(mountPoint)
				: mountPoint

			if (!outletElement) {
				throw new Error(`[createApp] Mount point "${mountPoint}" not found in document`)
			}

			// ── Favicon ───────────────────────────────────────────────────
			if (favicon) {
				const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
				const type = favicon.endsWith('.svg') ? 'image/svg+xml'
					: favicon.endsWith('.png') ? 'image/png'
						: favicon.endsWith('.ico') ? 'image/x-icon'
							: undefined

				if (existing) {
					existing.href = favicon
					if (type) existing.type = type
				} else {
					const link = document.createElement('link')
					link.rel = 'icon'
					link.href = favicon
					if (type) link.type = type
					document.head.appendChild(link)
				}
			}

			for (const plugin of plugins) {
				plugin(app)
			}

			for (const fn of initFns) {
				await fn()
			}

			const router = createRouter({
				outlet: outletElement,
				routes,
				fallback,
				appName: name,
				onError: onError ?? ((err) => console.error('[app]', err)),
			})

			router.interceptLinks()
		},

		mount() {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => app.init())
			} else {
				app.init()
			}
		},
	}

	return app
}