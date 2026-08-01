import { Hono } from 'hono'
import type { R2BucketLike } from './storage-route'

export type CdnRouteType = ReturnType<typeof createCdnRoute>

/**
 * Serves an uploaded R2 object back out at `/api/cdn/<key>`, deliberately
 * the one route in this package's whole API surface with **no**
 * session check at all, `.use('*', ...)` or otherwise: uploaded media is
 * public content, same as a real CDN, not an admin-only resource like
 * `storage-route.ts`'s own `/list`/`/upload`/`/file`/`/folder`. A consumer
 * needs zero route files of their own for this: the same "the library owns
 * the whole capability" shape `createStorageRoute`/`createContentRoute`
 * already have, just unauthenticated.
 *
 * Cached at two levels so a given file is fetched from R2 at most once per
 * warm edge location, not once per request: `Cache-Control` lets the
 * browser skip re-requesting entirely on repeat views within an hour, and
 * the Workers Cache API (`caches.default`) means even a *different*
 * visitor's request against a warm edge location can be served without
 * touching R2 at all. Deliberately `max-age=3600` with no `immutable`:
 * some upload keys are a plain, non-random filename (e.g. `avatar.webp`),
 * so a re-upload can legitimately overwrite the same key; `must-revalidate`
 * plus the R2 object's own `etag` means a stale cache entry revalidates
 * cheaply instead of serving old content indefinitely.
 */
/**
 * Purges one object's edge-cache entry, called by `storage-route.ts`'s own
 * delete handlers so a deleted file doesn't keep serving stale bytes from a
 * warm edge location for up to its own `max-age` (1 hour) after it's gone
 * from R2. Mirrors `createCdnRoute`'s own `cacheKey` construction exactly
 * (same `/api/cdn/<key>` path assumption `storage-route.ts`'s own listing
 * URLs already make), just built from the *deleting* request's own origin
 * rather than an incoming CDN request's, since both routes are always
 * mounted under the same origin by `createBaseConfigRoute`.
 */
export async function purgeCdnCache(
	origin: string,
	key: string
): Promise<void> {
	const cache = (caches as unknown as { default: Cache }).default
	await cache.delete(new Request(`${origin}/api/cdn/${key}`, { method: 'GET' }))
}

export function createCdnRoute(bucket: R2BucketLike) {
	// A plain `'/*'` wildcard route doesn't expose its match via
	// `c.req.param('*')` in this Hono version; confirmed empirically, it
	// comes back `undefined` even on a real match. A named regex capture
	// (`:key{.+}`) does, and matches the same set of paths.
	return new Hono().get('/:key{.+}', async (c) => {
		// `caches.default` is a real Cloudflare Workers runtime API; the DOM
		// lib's own `CacheStorage` interface (also in scope via a consumer's
		// `"lib": [..., "DOM"]`) shadows it and has no `default` property:
		// structural cast, not a real type gap.
		const cache = (caches as unknown as { default: Cache }).default

		// The Cache API throws ("Cannot cache response to non-GET request")
		// if given anything but a plain GET request object: a fresh, explicit
		// GET built from just the URL is what it actually needs as a key.
		const cacheKey = new Request(c.req.url, { method: 'GET' })

		const cached = await cache.match(cacheKey)
		if (cached) return cached

		// `c.req.param('key')` is the capture relative to this route's own
		// mount point, regardless of how deep `createBaseConfigRoute`/
		// `createHandler` end up nesting it, not `c.req.path`, which would
		// still carry whatever prefix (`/api/cdn`) it's mounted under.
		const key = decodeURIComponent(c.req.param('key') ?? '')
		if (!key) return c.text('Not found', 404)

		const object = await bucket.get(key)
		if (!object) return c.text('Not found', 404)

		const headers = new Headers()
		object.writeHttpMetadata(headers)
		headers.set('etag', object.httpEtag)
		headers.set('cache-control', 'public, max-age=3600, must-revalidate')

		const response = new Response(object.body, { headers })
		await cache.put(cacheKey, response.clone())
		return response
	})
}
