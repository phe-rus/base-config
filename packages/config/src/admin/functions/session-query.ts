import { useMutation, queryOptions, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getAuthClient, unwrap } from '../../db/collections'

/**
 * The tuned `queryOptions()` wrapper behind a consumer's own session query:
 * takes only a plain `() => Promise<TSession>` function reference (e.g. a
 * `createServerFn()`-built server function, never the real `auth` instance
 * itself), so this stays safe to import from an isomorphic route file with
 * zero risk of a secret-bearing binding being pulled into the client
 * bundle. The one piece that genuinely can't move into this package: the
 * actual `auth.api.getSession(...)` call needs the consumer's own real
 * `auth` instance and must run inside a `createServerFn()`/middleware
 * `.server()` callback in a file the consumer owns (see the root
 * `CLAUDE.md`'s "what stayed in `www` because the library structurally
 * can't own it" reasoning for `db`/`bindings.r2`, same shape here).
 *
 * `staleTime: Infinity`/`refetchOnWindowFocus: false`/`refetchOnReconnect: false`
 * is the actual "avoid redundant backend requests" logic this centralizes:
 * the session only ever changes via sign-in/sign-up/sign-out, each of which
 * already invalidates this query's own key, so there's no need to refetch on
 * every navigation/focus/reconnect. Confirmed this matters in practice: a
 * naive `staleTime: 0` session query shares better-auth's own rate-limit
 * bucket with the rest of `/api/auth/*`, and enough traffic (normal
 * browsing, dev testing) can exhaust it and leave the query retrying
 * indefinitely: a stuck "loading forever" admin page.
 *
 * A consumer's entire footprint for this collapses to one line:
 * `export const defferedSession = createSessionQueryOptions(useSessionFn)`,
 * where `useSessionFn` is their own tiny `createServerFn()`+middleware
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

type SessionUser = { name?: string | null; role?: string | string[] | null }
type AdminSessionData = { user: SessionUser } | null

/**
 * The one shared session read every admin-side gate uses: `Topbar`
 * (chrome/role redirect), `ProviderView.Context` (the reserved-`$collection`
 * auth-screen dispatch), `Dashboard` (the bare `/admin` index, a separate
 * route from the `$collection/$` catch-all). Built on `createSessionQueryOptions()`
 * above, but pointed at `authClient.getSession()` (better-auth's own
 * promise-based client method, never `fetch`) instead of a consumer's
 * `createServerFn()`, so this needs no consumer wiring at all. Every caller
 * gets the exact same TanStack Query cache entry (`queryKey: ['base-config',
 * 'session']`): real deduplication, not just three independent
 * subscriptions to better-auth's own reactive store, which is what produced
 * genuine duplicate `/api/auth/get-session` traffic before this existed.
 * No manual invalidation on sign-in/sign-out: both already navigate with
 * `reloadDocument: true`, which throws away this cache along with
 * everything else.
 *
 * `hasSession` is the one boolean every caller actually branches on:
 * `true` when a real session exists, but *also* `true` when `baseConfig()`
 * was never given an `auth` client at all (nothing to gate against, same as
 * this feature not existing, matches every other `getAuthClient()`-gated
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

/**
 * A public-facing counterpart to `useAdminSession()`, for a consumer's own
 * non-admin UI (a header, an account menu, ...) that wants to know "is
 * someone signed in" without any of `useAdminSession()`'s admin-gate-specific
 * `hasSession` semantics (deliberately `true` even with no session at all,
 * so an ungated admin route doesn't hang forever, wrong default for a
 * plain "am I logged in" read). **Reuses the exact same `queryFn` body as
 * `useAdminSession()`, not just the same `queryKey`**: two hooks sharing a
 * `queryKey` but returning differently-shaped data from their own `queryFn`
 * would corrupt whichever one didn't win the race to actually fetch; this
 * slices `.user` back out at the hook's own return, after the shared cache
 * value resolves, not at fetch time. Confirmed this is the actual dedup
 * mechanism at work: every caller (`useAdminSession()`, `useSession()`,
 * `Topbar`) genuinely shares one `/api/auth/get-session` request, not just
 * one query key with several independent fetches racing underneath it.
 */
export function useSession(): {
	user: SessionUser | null
	isPending: boolean
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
		return { user: null, isPending: false }
	}
	return {
		user: query.data?.user ?? null,
		isPending: query.isPending
	}
}

/**
 * Wraps `authClient.signOut()` plus a post-sign-out redirect: the exact
 * pattern `Topbar`'s own sign-out button already used inline (see its own
 * doc comment), extracted so a consumer's own non-admin UI doesn't have to
 * duplicate it, and so the two don't drift apart over time. `redirectTo`
 * accepts any resolved path string, not a typed route, same
 * "resolved literal path, not a typed route pattern" trade-off every other
 * dynamic `navigate({to})` call in this package already makes.
 */
export function useSignOut(options?: { redirectTo?: string }): {
	signOut: () => void
	isPending: boolean
} {
	const authClient = getAuthClient()
	const navigate = useNavigate()
	const mutation = useMutation({
		mutationFn: async () => {
			if (!authClient) {
				throw new Error(
					'useSignOut() was called but no `auth` was passed to baseConfig(): see BaseConfigProps["auth"].'
				)
			}
			return unwrap(await authClient.signOut())
		},
		onSuccess: () => {
			navigate({
				to: (options?.redirectTo ?? '/') as any,
				replace: true,
				reloadDocument: true
			})
		}
	})
	return { signOut: mutation.mutate, isPending: mutation.isPending }
}
