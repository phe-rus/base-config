import { createFactory } from 'hono/factory'
import type { Env } from 'hono/types'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'

export type IgniteOptions = {
	enabled?: boolean
	/**
	 * This package never reads `env`/runtime bindings itself: the consumer
	 * resolves its own environment (exactly as it already does for anything
	 * else server-only) and passes the result in.
	 */
	isDevelopment?: boolean
	/** Given an `Origin` header value, return the origin to allow, or `''` to deny. Omit to skip CORS entirely. */
	matchOrigin?: (origin: string) => string
	requestTimeoutMs?: number
	/**
	 * Hono's `etag()` unconditionally hashes every response body and 304s a
	 * matching `If-None-Match`, regardless of `Cache-Control`, and
	 * regardless of whether the calling client (e.g. an auth client that
	 * deliberately bypasses the HTTP cache for session/permission data) ever
	 * intended to reuse a cached body. For an API surface that's mostly
	 * dynamic (auth, admin data, per-request info), that silently replays
	 * stale responses as if they were fresh. Off by default; opt in only
	 * for routes that genuinely serve stable, cacheable content.
	 */
	etag?: boolean
}

/**
 * A reusable Hono app factory, generic over a consumer's own `Env`
 * (`{Bindings, Variables}`), the direct library-side counterpart to what
 * `www/src/api/io.ts` used to hand-roll on its own, matching Hono's own
 * `createFactory<Env>()` convention (one generic, not separate `Bindings`/
 * `Variables` type params). Call once per app to get a `factory`/`ignite`
 * pair typed against that app's concrete bindings; `factory` is exposed
 * alongside `ignite` since Hono middleware (`factory.createMiddleware(...)`)
 * needs the same generic binding.
 */
export function createIgnite<E extends Env = Env>() {
	const factory = createFactory<E>()

	function ignite({
		enabled = false,
		isDevelopment = false,
		matchOrigin,
		requestTimeoutMs = 5_000,
		etag: useEtag = false
	}: IgniteOptions = {}) {
		const app = factory.createApp()
		if (enabled) {
			app.use('*', (c, next) => {
				return secureHeaders({
					crossOriginOpenerPolicy: !isDevelopment,
					originAgentCluster: !isDevelopment,
					strictTransportSecurity: !isDevelopment
						? 'max-age=31536000; includeSubDomains'
						: false,
					crossOriginResourcePolicy: 'same-site'
				})(c, next)
			})
			app.use('*', requestId())
			app.use('*', logger())
			if (useEtag) {
				app.use('*', etag())
			}
			app.use('*', timeout(requestTimeoutMs))
			if (matchOrigin) {
				app.use(
					'*',
					cors({
						origin: matchOrigin,
						allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
						allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
						exposeHeaders: ['Content-Length'],
						maxAge: 86400,
						credentials: true
					})
				)
			}
		}
		return app
	}

	return { factory, ignite }
}
