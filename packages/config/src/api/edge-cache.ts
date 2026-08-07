/**
 * Whole-page edge caching for anonymous public reads, one import for a
 * consumer's own Worker fetch handler (`server.ts`): `edgeCache(fetchFn,
 * options)` wraps it, nothing else to wire up. Backed by Cloudflare's
 * Workers Cache (`wrangler.jsonc`'s `cache.enabled`), which sits in front of
 * the Worker: a stored response is served straight from Cloudflare's edge on
 * a hit, the Worker (and everything it would otherwise call, D1, KV, the
 * loopback `/api/*` fetch) never runs at all. Storage is controlled purely
 * by the response's own `Cache-Control` header (RFC 9111 semantics), so
 * every response gets an explicit verdict, never left to Workers Cache's own
 * default heuristics for an unmarked response.
 *
 * **Deliberately no purge-on-publish here, by design, not an oversight.**
 * Cloudflare's Workers Cache API (`caches.default`) is per-data-center, not
 * global: a `cache.delete()` call from inside a write only clears the copy
 * at whichever colo happened to handle that request, a visitor served by a
 * different colo keeps their own stale copy regardless. True global
 * invalidation on Cloudflare needs either the zone-level Purge Cache REST
 * API (a separate `CLOUDFLARE_API_TOKEN` + zone id, real extra setup) or
 * Cache-Tag purging (Enterprise-plan only), both real costs for a gain this
 * package isn't willing to force on every consumer by default. A short
 * `sMaxAge` here, backed by `content-cache.ts`'s own KV content cache
 * (already warmed synchronously on every write, zero extra setup, no
 * purge-locality caveat since a KV read always sees the latest write), gets
 * a publish visible everywhere within seconds with zero extra requests to
 * D1/KV and zero extra setup. A consumer that genuinely needs instant,
 * worldwide invalidation can still call `purgeEdgeCache` below directly from
 * its own `createHandler({hooks})`, this package just doesn't do it for you.
 */

export type EdgeCacheOptions = {
	/**
	 * Path prefixes never eligible for the edge cache, regardless of session
	 * state, in addition to `/api` (always excluded, not configurable: the
	 * content/storage API is always dynamic, some of it has side effects
	 * even on what look like reads). Pass a consumer's own admin path here
	 * (`config.adminPath`, `/admin` by default), the authenticated SPA shell
	 * is never meant for search engines or a static/edge-cached response.
	 */
	uncacheablePathPrefixes?: string[]
	/** Seconds a cached response is served fresh before Workers Cache treats it as stale. Default 60. */
	sMaxAge?: number
	/** Seconds a stale response can still be served while a background revalidation runs. Default 300. */
	staleWhileRevalidate?: number
}

/**
 * better-auth's session cookie is always named `<cookiePrefix>.session_token`
 * (better-auth's own cookie docs); matching the fixed `.session_token=`
 * suffix directly means this works regardless of a consumer's own
 * `cookiePrefix` with no need to import its auth config here. Deliberately
 * not "any cookie at all": a real anonymous browser can carry unrelated
 * cookies (Cloudflare's own, analytics, ...) that have nothing to do with
 * whether `auth.api.getSession()` would resolve a real user, treating those
 * as reason to skip caching would mean caching rarely or never engages.
 */
function hasSessionCookie(request: Request): boolean {
	const cookie = request.headers.get('cookie')
	return cookie !== null && cookie.includes('.session_token=')
}

/**
 * Whether this request is even a *candidate* for the edge cache, checked
 * before a consumer's own `handler.fetch()` runs. Doesn't decide the final
 * `Cache-Control` by itself, see `cacheControlFor` below, which also needs
 * the resulting response's own status.
 */
export function isCacheableRequest(
	request: Request,
	url: URL,
	options: EdgeCacheOptions = {}
): boolean {
	if (request.method !== 'GET' && request.method !== 'HEAD') return false
	const prefixes = ['/api', ...(options.uncacheablePathPrefixes ?? [])]
	if (prefixes.some((prefix) => url.pathname.startsWith(prefix))) return false
	return !hasSessionCookie(request)
}

/**
 * The actual `Cache-Control` value to force onto a response, computed after
 * a consumer's own `handler.fetch()` has already run. A deliberately short
 * default: `content-cache.ts`'s own KV content cache already keeps the
 * underlying data warm, so a page-cache miss here still only costs a KV
 * read, not a D1 one. `stale-while-revalidate` lets a request that lands
 * right as the TTL expires still get an instant response while a background
 * revalidation catches up, rather than making that one visitor pay for a
 * fresh render. Only a real `200` is ever cached, a `404`/`500` always
 * re-runs the Worker, so a transient failure or a genuinely broken link can
 * never get stuck served from cache.
 */
export function cacheControlFor(
	cacheable: boolean,
	response: Response,
	options: EdgeCacheOptions = {}
): string {
	if (cacheable && response.status === 200) {
		const sMaxAge = options.sMaxAge ?? 60
		const staleWhileRevalidate = options.staleWhileRevalidate ?? 300
		return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
	}
	return 'private, no-store'
}

/**
 * Wraps a Cloudflare Worker's own `fetch` export (same `(request, env, ctx)`
 * shape `ExportedHandler['fetch']` has, kept generic over `Env`/`Ctx` rather
 * than importing `@cloudflare/workers-types` for it, this package takes no
 * dependency on that package elsewhere either) with the cacheable-check
 * before and the `Cache-Control` header after, so a consumer's own
 * `server.ts` needs exactly one import and one call, nothing manual:
 *
 * ```ts
 * import { edgeCache } from '@baseconfig/core/api'
 * export default { fetch: edgeCache((request, env, ctx) => handler.fetch(request, {...}), { uncacheablePathPrefixes: ['/admin'] }) }
 * ```
 */
export function edgeCache<Env = unknown, Ctx = unknown>(
	fetchHandler: (
		request: Request,
		env: Env,
		ctx: Ctx
	) => Response | Promise<Response>,
	options: EdgeCacheOptions = {}
): (request: Request, env: Env, ctx: Ctx) => Promise<Response> {
	return async (request, env, ctx) => {
		const url = new URL(request.url)
		const cacheable = isCacheableRequest(request, url, options)
		const response = await fetchHandler(request, env, ctx)
		const withCacheControl = new Response(response.body, response)
		withCacheControl.headers.set(
			'cache-control',
			cacheControlFor(cacheable, response, options)
		)
		return withCacheControl
	}
}

/**
 * Evicts one or more URLs from Cloudflare's Workers Cache (`caches.default`).
 * Not called automatically by anything in this package, see this file's own
 * top-of-file doc comment for why (colo-local, not a true global purge): a
 * consumer that has its own reason to accept that trade-off (or fronts this
 * with a CDN/purge setup that doesn't have it) can still call this directly
 * from a `createHandler({hooks})` entry, e.g. an `afterChange` hook. `paths`
 * are resolved against `origin` (a cache key is a full URL, not just a
 * path); a hook has no `Request` of its own to read an origin from, so the
 * caller supplies its own known public origin. Mirrors `purgeCdnCache`'s own
 * cache-key construction (`cdn-route.ts`): a fresh, explicit `GET` `Request`
 * built from just the URL, since the Cache API throws on anything else.
 */
export async function purgeEdgeCache(
	origin: string,
	paths: string[]
): Promise<void> {
	// `caches.default` is a real Cloudflare Workers runtime API; the DOM
	// lib's own `CacheStorage` interface (also in scope via a consumer's
	// `"lib": [..., "DOM"]`) shadows it and has no `default` property:
	// structural cast, not a real type gap, same as `cdn-route.ts`'s own.
	const cache = (caches as unknown as { default: Cache }).default
	await Promise.all(
		paths.map((path) =>
			cache.delete(new Request(new URL(path, origin), { method: 'GET' }))
		)
	)
}
