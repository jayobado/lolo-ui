import type { Transport } from './base.ts'
import type { ServiceMap } from '../services/define.ts'
import type { SubscriptionCallbacks } from '../services/define.ts'
import { resolveServices } from './base.ts'
import type { ResolvedServices } from '../services/define.ts'

export interface TrpcAdapterOptions {
	baseUrl?: string
	getHeaders?: () => Record<string, string>
	onError?: (err: ApiError) => void
}

export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string
	) {
		super(message)
		this.name = 'ApiError'
	}
}

function createTrpcTransport(options: TrpcAdapterOptions): Transport {
	const {
		baseUrl = '/api',
		getHeaders = (): Record<string, string> => ({}),
		onError,
	} = options

	async function handleResponse<T>(res: Response): Promise<T> {
		const json = await res.json() as {
			data?: T
			error?: { message: string; code: string }
		}
		if (!res.ok || json.error) {
			const err = new ApiError(
				res.status,
				json.error?.code ?? 'UNKNOWN',
				json.error?.message ?? res.statusText
			)
			onError?.(err)
			throw err
		}
		return json.data as T
	}

	async function query<TInput, TOutput>(
		path: string,
		input: TInput
	): Promise<TOutput> {
		const qs = input != null
			? `?input=${encodeURIComponent(JSON.stringify(input))}`
			: ''
		const res = await fetch(`${baseUrl}/${path}${qs}`, {
			method: 'GET',
			credentials: 'same-origin', // ← ensures cookie is sent
			headers: { 'Content-Type': 'application/json', ...getHeaders() },
		})
		return handleResponse<TOutput>(res)
	}

	async function mutate<TInput, TOutput>(
		path: string,
		input: TInput
	): Promise<TOutput> {
		const res = await fetch(`${baseUrl}/${path}`, {
			method: 'POST',
			credentials: 'same-origin', // ← ensures cookie is sent
			headers: { 'Content-Type': 'application/json', ...getHeaders() },
			body: JSON.stringify(input ?? {}),
		})
		return handleResponse<TOutput>(res)
	}

	function subscribe<TInput, TOutput>(
		path: string,
		input: TInput,
		callbacks: SubscriptionCallbacks<TOutput>
	): () => void {
		const inputStr = encodeURIComponent(JSON.stringify(input ?? {}))
		// EventSource always sends cookies automatically — no token param needed
		const url = `${baseUrl}/${path}/subscribe?input=${inputStr}`

		const source = new EventSource(url, { withCredentials: true })

		source.addEventListener('message', (e: MessageEvent) => {
			try {
				callbacks.onData(JSON.parse((e as MessageEvent<string>).data).data as TOutput)
			} catch (err) {
				callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
			}
		})
		source.addEventListener('error', () => {
			callbacks.onError?.(new Error('SSE connection error'))
			source.close()
		})
		source.addEventListener('done', () => {
			callbacks.onComplete?.()
			source.close()
		})

		return () => source.close()
	}


	return { query, mutate, subscribe }
}

export function createTrpcAdapter<T extends ServiceMap>(
	services: T,
	options: TrpcAdapterOptions = {}
): ResolvedServices<T> {
	return resolveServices(services, createTrpcTransport(options))
}