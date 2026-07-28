import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { collectEndpointFactories, collectHooks } from '../collections/registry'
import { createIgnite } from './ignite'
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

/**
 * Every real Cloudflare platform binding `createHandler()` needs, grouped
 * under one key — separates "raw platform bindings only the consumer's own
 * `env` can resolve" from the behavioral config sitting alongside it
 * (`auth`, `cors`). `r2`/`kv` are named after the Cloudflare *product*
 * (matching how `env` itself groups bindings), not the internal role each
 * plays — see `BaseConfigRouteBindings`' own `bucket`/`cache` doc comments
 * (`api/route.ts`) for what each is actually used for.
 */
export type CreateHandlerBindings = {
	/** The consumer's own R2 bucket binding (e.g. `env.MEDIA`) — see `createStorageRoute`'s own doc comment (`api/storage-route.ts`). */
	r2: BaseConfigRouteBindings['bucket']
	/** The consumer's own KV binding for the public-read cache — see `ContentRouteBindings['cache']`'s own doc comment (`db/content-route.ts`). Omit for no caching. */
	kv?: BaseConfigRouteBindings['cache']
	/** Relaxes some of `ignite()`'s own production-only security headers (HSTS, etc.) — not a binding itself, grouped here anyway since it's part of the same "environment facts only the consumer's own `env` can answer" bundle. */
	isdev?: boolean
}

export type CreateHandlerOptions = {
	/** The consumer's own `drizzle(env.BASECONFIG, ...)` instance — see `createContentRoute`'s own doc comment (`db/content-route.ts`). */
	db: BaseConfigRouteBindings['db']
	/** The consumer's own `betterAuth()` instance — see `AuthServerLike`'s own doc comment for why this stays structural. */
	auth: AuthServerLike
	/** See `CreateHandlerBindings`' own doc comment. */
	bindings: CreateHandlerBindings
	/** Given an `Origin` header value, return the origin to allow, or `''` to deny. Omit to skip CORS entirely. */
	cors?: (origin: string) => string
	/** See `ContentRouteBindings['hooks']`'s own doc comment (`db/content-route.ts`) — Tier-2, binding-capable hooks, merged with the isomorphic Tier-1 map every registered collection/global already contributed. */
	hooks?: BaseConfigRouteBindings['hooks']
	/** See `ContentEndpoint`'s own doc comment (`db/content-route.ts`) — Tier-2 endpoints, merged with whatever every registered plugin's own `EndpointFactory` already contributed. */
	endpoints?: BaseConfigRouteBindings['endpoints']
	requestTimeoutMs?: number
	etag?: boolean
}

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
 * `bindings.{r2,kv}` (real bindings only the consumer's own `env` can
 * resolve — this package has never read `env` itself anywhere, see
 * `createIgnite`'s own doc comment for why; `kv` is optional, see
 * `CreateHandlerBindings`' own doc comment for what it does when given),
 * `auth` (no dependency on any one auth library), `hooks`/`endpoints`
 * (Tier-2, binding-capable — see `CollectionHooks`'/`ContentEndpoint`'s own
 * doc comments for the tier split), and `cors`/`bindings.isdev` (a
 * deployment's own CORS/origin policy — e.g. which domains are allowed —
 * that this package has no way to know on its own). **Deliberately not a
 * param here**: anything capability-specific to one particular plugin (an
 * email sender, a payments client, …) — those stay on that plugin's own
 * dedicated hook instead (e.g. `@base/plugin-form-builder`'s own
 * `onFormBuilderEmail()`), never growing this function's signature per
 * plugin. See `EndpointFactoryBindings`' own doc comment
 * (`db/content-route.ts`) for the full reasoning.
 *
 * **Merges `hooks` with `collectHooks()`'s own Tier-1 map** (`collections/registry.ts`)
 * before passing either down — a plain shallow merge, per-slug: if the same
 * slug has hooks from both tiers, the Tier-2 entry passed here wins
 * *entirely* for that slug (not a per-hook-function merge) — a real,
 * disclosed limitation, not a hidden one; a slug needing both a pure
 * config-level hook and a binding-capable one should just define both
 * inside the one Tier-2 entry instead of splitting them.
 *
 * **Also invokes every registered `EndpointFactory`** (`collectEndpointFactories()`,
 * `collections/registry.ts`) with `{db}`, merging the results with the
 * explicit `endpoints` param — see `EndpointFactory`'s own doc comment
 * (`db/content-route.ts`) for why this is *the* mechanism that keeps a
 * plugin's entire footprint inside `base.config.ts`'s `plugins: [...]`: a
 * consumer's server entry only ever hands this function truly generic
 * bindings, never anything plugin-specific.
 *
 * A consumer's entire server-side footprint collapses to building this
 * once and serving it from whatever route file matches `/api/*` — e.g.
 * TanStack Start's own `@base/config/api`'s `Handler(app)` wrapping the
 * returned app into a `{GET, POST, ...}` method map.
 */
export function createHandler({
	db,
	auth,
	bindings,
	cors,
	hooks,
	endpoints,
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

	const mergedHooks = { ...collectHooks(), ...hooks }
	const factoryEndpoints = collectEndpointFactories().flatMap((factory) =>
		factory({ db })
	)
	const mergedEndpoints = [...factoryEndpoints, ...(endpoints ?? [])]

	return ignite({
		enabled: true,
		isDevelopment: bindings.isdev,
		matchOrigin: cors,
		requestTimeoutMs,
		etag
	})
		.use('*', sessionMiddleware)
		.route(
			'/api',
			new Hono<HandlerEnv>().route('/auth', authRoute).route(
				'/',
				createBaseConfigRoute({
					db,
					bucket: bindings.r2,
					cache: bindings.kv,
					hooks: mergedHooks,
					endpoints: mergedEndpoints
				})
			)
		)
}
