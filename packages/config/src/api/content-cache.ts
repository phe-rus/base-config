/**
 * The storage-agnostic public-read cache `content-route.ts` fronts every
 * genuinely scoped read through. `documentCacheKey`/`slugCacheKey`/
 * `globalCacheKey` (the three key builders that used to live directly in
 * `content-route.ts`) plus the `JSON.stringify`/`JSON.parse` encode/decode
 * around them are collected here behind one `ContentCache` interface,
 * `get`/`put`/`delete` keyed by a `CacheResource` rather than a raw string,
 * so the route itself never builds a cache key or touches `JSON` directly.
 * Pulled out on its own so a future backend (Workers `caches.default`, a
 * zone-level CDN purge call, anything else) can implement the same
 * interface without `content-route.ts` changing at all, only whichever
 * `create*ContentCache` call site builds it would.
 *
 * Extracted with **zero behavior change**: the three resource kinds below
 * are exactly the three shapes `content-route.ts` already cached, see
 * `../api/CLAUDE.md`'s caching section for why a plain filtered/paginated
 * list isn't a fourth kind yet, no single natural key the way one
 * document/slug/global has.
 */

/**
 * The exact slice of Cloudflare's real `KVNamespace` `createKVContentCache`
 * calls on, structural, same trade-off `R2BucketLike`/`BetterAuthAdminClient`
 * already make so this package never needs `@cloudflare/workers-types` as a
 * dependency for one binding's ambient type. A consumer's real `env.CACHE`
 * satisfies this without a cast.
 */
export type KVNamespaceLike = {
	get: (key: string) => Promise<string | null>
	put: (key: string, value: string) => Promise<void>
	delete: (key: string) => Promise<void>
}

/**
 * What a cache lookup/write/invalidation is actually about, not a raw
 * string: `content-route.ts` builds one of these per call site instead of
 * calling a key-building function itself, so the real key format (and the
 * fact that it's KV-shaped at all) stays private to whichever `ContentCache`
 * implementation is in use.
 */
export type CacheResource =
	| { kind: 'document'; collection: string; id: string }
	| { kind: 'document-slug'; collection: string; slug: string }
	/**
	 * The whole, unfiltered, unpaginated result of `GET /:collection` for a
	 * given collection, exactly what a nav-tree/index view (e.g. the docs
	 * list) actually queries. One key per collection, not per query: safe
	 * because a `read` access function only ever sees `req.user` for a list
	 * read (`AccessArgs`, `base.types.ts`, no `id`/`data`), so an anonymous
	 * request's resolved `accessWhere` is the same value every time for a
	 * given collection, there's no second, different scoped shape this could
	 * ever collide with. This is *why* there's no `where`/`limit`/`page`
	 * folded into the key the way a real per-query cache would need: this
	 * resource only exists for the one shape that has none of those
	 * (`content-route.ts`'s own `cacheableListLookup`), a genuinely
	 * filtered/paginated list still has no natural single key and stays
	 * uncached, same reasoning `ContentRouteBindings['cache']` already
	 * documents.
	 */
	| { kind: 'list'; collection: string }
	| { kind: 'global'; slug: string }

function resourceKey(resource: CacheResource): string {
	switch (resource.kind) {
		case 'document':
			return `content:${resource.collection}:${resource.id}`
		case 'document-slug':
			return `content:${resource.collection}:slug:${resource.slug}`
		case 'list':
			return `content:${resource.collection}:list`
		case 'global':
			return `content:global:${resource.slug}`
	}
}

/**
 * The one interface `content-route.ts` depends on. `get` returns `undefined`
 * on a miss (never `null`), so a cached falsy value, if one were ever
 * legitimately stored, can't be confused with "not cached"; every call site
 * today only ever caches a truthy result, so this distinction is defensive
 * rather than currently load-bearing. `get`'s type parameter defaults to
 * `any`, matching the untyped `JSON.parse(...)` every call site relied on
 * before this extraction, not a new looseness.
 */
export type ContentCache = {
	get: <T = any>(resource: CacheResource) => Promise<T | undefined>
	put: (resource: CacheResource, value: unknown) => Promise<void>
	delete: (resource: CacheResource) => Promise<void>
}

/**
 * The only `ContentCache` implementation today, a thin adapter over the exact
 * `KVNamespaceLike` binding `content-route.ts` used to call directly:
 * `resourceKey()` plus `JSON.stringify`/`JSON.parse`, nothing else. A
 * consumer's `createHandler({bindings: {kv: env.CACHE}, ...})` call is
 * unchanged, `createContentRoute` wraps whatever `KVNamespaceLike` it's
 * handed in this before ever reading/writing it.
 */
export function createKVContentCache(kv: KVNamespaceLike): ContentCache {
	return {
		async get<T = any>(resource: CacheResource) {
			const raw = await kv.get(resourceKey(resource))
			return raw === null ? undefined : (JSON.parse(raw) as T)
		},
		async put(resource: CacheResource, value: unknown) {
			await kv.put(resourceKey(resource), JSON.stringify(value))
		},
		async delete(resource: CacheResource) {
			await kv.delete(resourceKey(resource))
		}
	}
}
