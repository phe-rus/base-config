import { queryOptions } from '@tanstack/react-query'

/**
 * The tuned `queryOptions()` wrapper behind a consumer's own session query —
 * takes only a plain `() => Promise<TSession>` function reference (e.g. a
 * `createServerFn()`-built server function, never the real `auth` instance
 * itself), so this stays safe to import from an isomorphic route file with
 * zero risk of a secret-bearing binding being pulled into the client
 * bundle. The one piece that genuinely can't move into this package: the
 * actual `auth.api.getSession(...)` call needs the consumer's own real
 * `auth` instance and must run inside a `createServerFn()`/middleware
 * `.server()` callback in a file the consumer owns (see the root
 * `CLAUDE.md`'s "what stayed in `www` because the library structurally
 * can't own it" reasoning for `db`/`bindings.r2` — same shape here).
 *
 * `staleTime: Infinity`/`refetchOnWindowFocus: false`/`refetchOnReconnect: false`
 * is the actual "avoid redundant backend requests" logic this centralizes —
 * the session only ever changes via sign-in/sign-up/sign-out, each of which
 * already invalidates this query's own key, so there's no need to refetch on
 * every navigation/focus/reconnect. Confirmed this matters in practice: a
 * naive `staleTime: 0` session query shares better-auth's own rate-limit
 * bucket with the rest of `/api/auth/*`, and enough traffic (normal
 * browsing, dev testing) can exhaust it and leave the query retrying
 * indefinitely — a stuck "loading forever" admin page.
 *
 * A consumer's entire footprint for this collapses to one line:
 * `export const defferedSession = createSessionQueryOptions(useSessionFn)`
 * — where `useSessionFn` is their own tiny `createServerFn()`+middleware
 * pair (unchanged from what it already had to be).
 */
export function createSessionQueryOptions<TSession>(
	getSession: () => Promise<TSession>
) {
	return () =>
		queryOptions({
			queryKey: ['base-config', 'session'],
			queryFn: getSession,
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false
		})
}
