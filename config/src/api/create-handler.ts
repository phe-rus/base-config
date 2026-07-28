import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { createIgnite } from './ignite'
import type { IgniteOptions } from './ignite'
import { createBaseConfigRoute } from './route'
import type { BaseConfigRouteBindings } from './route'

type SessionLike = { user: { role?: string | null } }

type HandlerEnv = { Variables: { session?: SessionLike | null } }

/**
 * The exact slice of a `betterAuth()` server instance this needs —
 * structural, not `typeof auth` itself, same trade-off
 * `db/collections.ts`'s `BetterAuthAdminClient` already makes so this
 * package never depends on `better-auth` directly. `handler` serves
 * `/auth/*`; `api.getSession` is what the session middleware below reads on
 * every request so `content-route.ts`/`storage-route.ts`'s own admin-only
 * gates have something to check.
 */
export type AuthServerLike = {
	handler: (request: Request) => Promise<Response>
	api: {
		getSession: (opts: { headers: Headers }) => Promise<SessionLike | null>
	}
}

export type CreateHandlerOptions = BaseConfigRouteBindings & {
	/** The consumer's own `betterAuth()` instance — see `AuthServerLike`'s own doc comment for why this stays structural. */
	auth: AuthServerLike
} & Pick<
		IgniteOptions,
		'isDevelopment' | 'matchOrigin' | 'requestTimeoutMs' | 'etag'
	>

/**
 * The one call a consumer's own server-side API entry needs to make —
 * composes everything this package owns as API routes (content+storage via
 * `createBaseConfigRoute`), the consumer's own better-auth instance mounted
 * at `/auth/*`, the session middleware every admin-only route needs, and
 * CORS/security headers (`createIgnite`'s own `ignite()`) into one Hono
 * app, mounted at `/api` — matching the base path `baseConfig()`'s own
 * internal `hc<BaseConfigRouteType>()` client (`define.ts`) already assumes.
 *
 * What this can't own, and takes as an explicit param instead: `db`/
 * `bucket` (real bindings only the consumer's own `env` can resolve — this
 * package has never read `env` itself anywhere, see `createIgnite`'s own
 * doc comment for why), `auth` (no dependency on any one auth library), and
 * `matchOrigin`/`isDevelopment` (a deployment's own CORS/origin policy —
 * e.g. which domains are allowed — that this package has no way to know on
 * its own).
 *
 * A consumer's entire server-side footprint collapses to building this
 * once and serving it from whatever route file matches `/api/*` — e.g.
 * TanStack Start's own `@base/config/api`'s `Handler(app)` wrapping the
 * returned app into a `{GET, POST, ...}` method map.
 */
export function createHandler({
	db,
	bucket,
	auth,
	isDevelopment,
	matchOrigin,
	requestTimeoutMs,
	etag
}: CreateHandlerOptions) {
	const { ignite } = createIgnite<HandlerEnv>()

	const authRoute = new Hono<HandlerEnv>().on(['GET', 'POST'], '/*', (c) =>
		auth.handler(c.req.raw)
	)

	const sessionMiddleware: MiddlewareHandler<HandlerEnv> = async (c, next) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers })
		c.set('session', session ?? undefined)
		await next()
	}

	return ignite({
		enabled: true,
		isDevelopment,
		matchOrigin,
		requestTimeoutMs,
		etag
	})
		.use('*', sessionMiddleware)
		.route(
			'/api',
			new Hono<HandlerEnv>()
				.route('/auth', authRoute)
				.route('/', createBaseConfigRoute({ db, bucket }))
		)
}
