import handler from '@tanstack/react-start/server-entry'

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
		return await handler.fetch(request, {
			context: {
				// @ts-expect-error
				env: env,
				waitUntil: ctx.waitUntil.bind(ctx),
				passThroughOnException: ctx.passThroughOnException.bind(ctx)
			}
		})
	}
}
