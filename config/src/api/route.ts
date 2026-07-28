import { Hono } from 'hono'
import type { ContentDatabase } from '../db/content-queries'
import { createContentRoute } from '../db/content-route'
import { createStorageRoute } from './storage-route'

export type BaseConfigRouteBindings = {
	/** The consumer's own `drizzle(env.BASECONFIG, ...)` instance — see `createContentRoute`'s own doc comment. */
	db: ContentDatabase
	/** The consumer's own R2 bucket binding — see `createStorageRoute`'s own doc comment. */
	bucket: Parameters<typeof createStorageRoute>[0]
}

/**
 * Everything `@base/config` itself owns as API routes — content CRUD and
 * storage — composed into one app a consumer mounts with a single call:
 *
 * ```ts
 * const baseConfigRoute = createBaseConfigRoute({ db: contentdb, bucket: env.MEDIA })
 *
 * const apiRoute = io()
 * 	.route('/auth', authRoute)
 * 	.route('/', baseConfigRoute)
 * 	.get('/', (c) => c.json(c.req.raw.cf))
 * ```
 *
 * Content is mounted at the API's own root (`/api/<collection>`,
 * `/api/globals/<slug>` — real REST addresses, matching Payload's own
 * shape, see `createContentRoute`'s own doc comment for exactly why),
 * storage at `/storage/*`. `/storage` is registered *before* the content
 * route's own root mount — see `createContentRoute`'s own doc comment for
 * why registration order (not "how specific a prefix looks") is what
 * actually resolves an ambiguous match against content's `/:collection`
 * wildcard.
 */
export function createBaseConfigRoute(bindings: BaseConfigRouteBindings) {
	return new Hono()
		.route('/storage', createStorageRoute(bindings.bucket))
		.route('/', createContentRoute(bindings.db))
}

/** The type `createHandler()` (`api/create-handler.ts`) and `baseConfig()`'s own internal `hc<BaseConfigRouteType>()` client both key off — the one Hono app type this package's client-side RPC building needs, now that a consumer no longer builds and injects its own `hc<TypeRouter>()` client (see `create-handler.ts`'s own doc comment). */
export type BaseConfigRouteType = ReturnType<typeof createBaseConfigRoute>
