import type { Transport } from './base.ts'
import type { ServiceMap } from '../services/define.ts'
import type { SubscriptionCallbacks } from '../services/define.ts'
import { resolveServices } from './base.ts'
import type { ResolvedServices } from '../services/define.ts'

export interface RestAdapterOptions {
	baseUrl: string
	getHeaders?: () => Record<string, string>
	onError?: (err: RestError) => void
	methodMap?: Record<string, 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>
}

export class RestError extends Error {
	constructor(
		public status: number,
		public body: unknown,
		message: string
	) {
		super(message)
		this.name = 'RestError'
	}
}

function createRestTransport(options: RestAdapterOptions): Transport {
	const {
		baseUrl,
		getHeaders = () => ({}),
		onError,
		methodMap = {},
	} = options

	async function request<TOutput>(
		method: string,
		path: string,
		body?: unknown,
		qs?: string
	): Promise<TOutput> {
		const url = `${baseUrl}/${path}${qs ? `?${qs}` : ''}`
		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json', ...getHeaders() },
			body: body != null ? JSON.stringify(body) : undefined,
		})
		if (res.status === 204) return undefined as TOutput
		const json = await res.json()
		if (!res.ok) {
			const err = new RestError(res.status, res.statusText, json)
			onError?.(err)
			throw err
		}
		return json as TOutput
	}

	function query<TInput, TOutput>(path: string, input: TInput): Promise<TOutput> {
		const override = methodMap[path]
		if (override && override !== 'GET') return request<TOutput>(override, path, input)
		const qs = input != null
			? new URLSearchParams(
				Object.entries(input as Record<string, string>)
					.map(([k, v]) => [k, String(v)])
			).toString()
			: ''
		return request<TOutput>('GET', path, undefined, qs)
	}

	function mutate<TInput, TOutput>(path: string, input: TInput): Promise<TOutput> {
		return request<TOutput>(methodMap[path] ?? 'POST', path, input)
	}

	function subscribe<TInput, TOutput>(
		path: string,
		input: TInput,
		callbacks: SubscriptionCallbacks<TOutput>
	): () => void {
		const inputStr = encodeURIComponent(JSON.stringify(input ?? {}))
		const source = new EventSource(`${baseUrl}/${path}/stream?input=${inputStr}`)
		source.addEventListener('message', (e: MessageEvent) => {
			try { callbacks.onData(JSON.parse(e.data) as TOutput) }
			catch (err) { callbacks.onError?.(err instanceof Error ? err : new Error(String(err))) }
		})
		source.addEventListener('error', () => {
			callbacks.onError?.(new Error('SSE connection error'))
			source.close()
		})
		return () => source.close()
	}

	return { query, mutate, subscribe }
}

export function createRestAdapter<T extends ServiceMap>(
	services: T,
	options: RestAdapterOptions
): ResolvedServices<T> {
	return resolveServices(services, createRestTransport(options))
}