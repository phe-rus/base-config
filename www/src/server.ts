import handler from '@tanstack/react-start/server-entry'
import { edgeCache } from '@baseconfig/core/api'

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
	fetch: edgeCache(
		(request: Request, env: Env, ctx: ExecutionContext) =>
			handler.fetch(request, {
				context: {
					// @ts-expect-error
					env: env,
					waitUntil: ctx.waitUntil.bind(ctx),
					passThroughOnException: ctx.passThroughOnException.bind(ctx)
				}
			}),
		{
			uncacheablePathPrefixes: ['/admin'],
			sMaxAge: 5,
			staleWhileRevalidate: 30
		}
	)
}
