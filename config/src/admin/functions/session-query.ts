import { queryOptions, useQuery } from '@tanstack/react-query'
import { getAuthClient } from '../../db/collections'

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

type AdminSessionData = { user: { role?: string | string[] | null } } | null

/**
 * The one shared session read every admin-side gate uses — `Topbar`
 * (chrome/role redirect), `ProviderView.Context` (the reserved-`$collection`
 * auth-screen dispatch), `Dashboard` (the bare `/admin` index, a separate
 * route from the `$collection/$` catch-all). Built on `createSessionQueryOptions()`
 * above, but pointed at `authClient.getSession()` (better-auth's own
 * promise-based client method — never `fetch`) instead of a consumer's
 * `createServerFn()`, so this needs no consumer wiring at all. Every caller
 * gets the exact same TanStack Query cache entry (`queryKey: ['base-config',
 * 'session']`) — real deduplication, not just three independent
 * subscriptions to better-auth's own reactive store, which is what produced
 * genuine duplicate `/api/auth/get-session` traffic before this existed.
 * No manual invalidation on sign-in/sign-out: both already navigate with
 * `reloadDocument: true`, which throws away this cache along with
 * everything else.
 *
 * `hasSession` is the one boolean every caller actually branches on —
 * `true` when a real session exists, but *also* `true` when `baseConfig()`
 * was never given an `auth` client at all (nothing to gate against, same as
 * this feature not existing — matches every other `getAuthClient()`-gated
 * surface in this package).
 */
export function useAdminSession(): {
	data: AdminSessionData
	isPending: boolean
	hasSession: boolean
} {
	const authClient = getAuthClient()
	const query = useQuery({
		...createSessionQueryOptions(async () => {
			const result = await authClient?.getSession()
			return (result?.data ?? null) as AdminSessionData
		})(),
		enabled: Boolean(authClient)
	})

	if (!authClient) {
		return { data: null, isPending: false, hasSession: true }
	}
	return {
		data: query.data ?? null,
		isPending: query.isPending,
		hasSession: !query.isPending && Boolean(query.data)
	}
}
