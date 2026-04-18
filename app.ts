import { createRouter } from './router.ts'
import type { RouteDefinition, RouterOptions } from './router.ts'

export interface AppOptions {
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
	const { mountPoint = '#app', routes, fallback, onError } = options
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
		}
	}

	return app
}