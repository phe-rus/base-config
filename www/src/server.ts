import handler from '@tanstack/react-start/server-entry'
import { cacheControlFor, isCacheableRequest } from '@/lib/edge-cache'

export type RequestContext = {
	env: Env
	waitUntil: (promise: Promise<unknown>) => void
	passThroughOnException: () => void
}

declare module '@tanstack/react-start' {
	interface Register {
		server: RequestContext
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)
		const cacheable = isCacheableRequest(request, url)

		const response = await handler.fetch(request, {
			context: {
				// @ts-expect-error
				env: env,
				waitUntil: ctx.waitUntil.bind(ctx),
				passThroughOnException: ctx.passThroughOnException.bind(ctx)
			}
		})

		// Every response gets an explicit `Cache-Control` verdict, see
		// `cacheControlFor`'s own doc comment (`lib/edge-cache.ts`): this is
		// what Workers Cache (`wrangler.jsonc`'s `cache.enabled`) actually
		// keys its storage decision on.
		const withCacheControl = new Response(response.body, response)
		withCacheControl.headers.set(
			'cache-control',
			cacheControlFor(cacheable, response)
		)
		return withCacheControl
	}
}
