/**
 * Whole-page edge caching for anonymous public reads, `server.ts`'s own
 * wrapper around `handler.fetch()`. Backed by Cloudflare Workers Cache
 * (`wrangler.jsonc`'s `cache.enabled`), which sits in front of this Worker:
 * a stored response is served straight from Cloudflare's edge on a hit, this
 * Worker (and everything it would otherwise call, D1, KV, the loopback
 * `/api/*` fetch) never runs at all. Storage is controlled purely by the
 * response's own `Cache-Control` header (RFC 9111 semantics), so every
 * response gets an explicit verdict here, never left to Workers Cache's own
 * default heuristics for an unmarked response.
 */

/**
 * Never edge-cacheable regardless of session state: the content/storage/CDN
 * API (`/api/*`, always dynamic, some of it has side effects even on what
 * look like reads) and the admin SPA shell (`/admin`, always meant for a
 * signed-in editor).
 */
const UNCACHEABLE_PATH_PREFIXES = ['/api', '/admin']

/**
 * better-auth's session cookie is always named `<cookiePrefix>.session_token`
 * (better-auth's own cookie docs), the prefix here is `env.VITE_APPNAME`
 * (`src/config/api/auth/auth.ts`'s own `advanced.cookiePrefix`), but matching
 * the fixed `.session_token=` suffix directly means this stays correct even
 * if that prefix ever changes, with no need to import the auth config into
 * this file. Deliberately not "any cookie at all": a real anonymous browser
 * can carry unrelated cookies (Cloudflare's own, analytics, ...) that have
 * nothing to do with whether `auth.api.getSession()` would resolve a real
 * user, treating those as reason to skip caching would mean caching rarely
 * or never actually engages.
 */
function hasSessionCookie(request: Request): boolean {
	const cookie = request.headers.get('cookie')
	return cookie !== null && cookie.includes('.session_token=')
}

/**
 * Whether this request is even a *candidate* for the edge cache, checked
 * before `handler.fetch()` runs. Doesn't decide the final `Cache-Control` by
 * itself, see `cacheControlFor()`, which also needs the resulting response's
 * own status.
 */
export function isCacheableRequest(request: Request, url: URL): boolean {
	if (request.method !== 'GET' && request.method !== 'HEAD') return false
	if (
		UNCACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
	) {
		return false
	}
	return !hasSessionCookie(request)
}

/**
 * The actual `Cache-Control` value to force onto a response, computed after
 * `handler.fetch()` has already run. `s-maxage=60` is a deliberately short,
 * adjustable default: content-route.ts's own KV content cache (Stages 1-3)
 * already keeps the underlying data warm, so a page-cache miss here still
 * only costs a KV read, not a D1 one, a short TTL trades a little staleness
 * for a much simpler v1 than exact purge-on-publish (which would need
 * `www`-specific knowledge of which URL a given collection/slug maps to,
 * nothing the generic engine can own, see `packages/config/src/api/CLAUDE.md`
 * for the equivalent reasoning on the KV side). `stale-while-revalidate`
 * lets a request that lands right as the TTL expires still get an instant
 * response while a background revalidation catches up, rather than making
 * that one visitor pay for a fresh render. Only a real `200` is ever cached,
 * a `404`/`500` always re-runs the Worker, so a transient failure or a
 * genuinely broken link can never get stuck served from cache.
 */
export function cacheControlFor(
	cacheable: boolean,
	response: Response
): string {
	if (cacheable && response.status === 200) {
		return 'public, s-maxage=60, stale-while-revalidate=300'
	}
	return 'private, no-store'
}
