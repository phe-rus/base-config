import { useParams } from '@tanstack/react-router'
import type { PropsWithChildren, ReactNode } from 'react'
import { collectionsBySlug, globalsBySlug } from '../../collections/registry'
import type { CollectionSlug, GlobalSlug } from '../../collections/types'
import { getAuthClient, type BetterAuthAdminClient } from '../../db/collections'
import { RouteViewContext } from './context'
import type { RouteViewState } from './context'

type ProviderViewContextProps = PropsWithChildren

type ProviderViewComponent = {
	Context: (props: ProviderViewContextProps) => ReactNode
}

type AuthRouteViewMode =
	| 'login'
	| 'create-account'
	| 'forgot-password'
	| 'reset-password'

const AUTH_ROUTE_VIEW_MODES = new Set<string>([
	'login',
	'create-account',
	'forgot-password',
	'reset-password'
])

/**
 * `hasSession` gates everything below it: with no session, `slug` is
 * resolved against the reserved auth-screen names instead of
 * `collectionsBySlug`/`globalsBySlug` — the exact same one-dispatcher
 * mechanism every real collection/global already goes through, just a
 * different reserved set of `$collection` values. Falls back to `'login'`
 * for anything else (including a bare `/admin`), matching
 * `LoginView`/etc.'s own already-established default entry point. Once
 * `hasSession` is true, behavior is 100% unchanged from before this existed.
 */
function resolveRouteView(
	slug: CollectionSlug | GlobalSlug,
	splat: string | undefined,
	hasSession: boolean
): RouteViewState {
	if (!hasSession) {
		return {
			mode: (AUTH_ROUTE_VIEW_MODES.has(slug)
				? slug
				: 'login') as AuthRouteViewMode
		}
	}

	const segments = splat ? splat.split('/').filter(Boolean) : []
	if (segments.length > 1) return { mode: 'not-found', slug }
	const uid = segments[0]

	const globalConfig = globalsBySlug[slug as GlobalSlug]
	if (globalConfig) {
		// A global has no sub-documents — `/admin/<global>/<uid>` never
		// resolved before either, back when this was two separate route
		// files and the router itself rejected the extra segment.
		if (uid) return { mode: 'not-found', slug }
		return globalConfig.custom
			? { mode: 'custom', globalConfig }
			: { mode: 'global', globalConfig }
	}

	const collectionConfig = collectionsBySlug[slug as CollectionSlug]
	if (!collectionConfig) return { mode: 'not-found', slug }

	return uid
		? { mode: 'edit', collectionConfig, uid }
		: { mode: 'list', collectionConfig }
}

/**
 * Resolves `$collection`'s slug (and the `$collection/$` splat route's own
 * `_splat` param, once matched) against `collectionsBySlug`/`globalsBySlug`
 * a single time per navigation, providing the result via `useRouteView()`
 * (`context.tsx`) — `entry.tsx` is then a pure dispatcher with no lookup
 * logic of its own. Mounted once, at the `$collection` layout route
 * (`route.tsx`), above the `$` splat route it wraps.
 */
function ProviderViewContextResolved({
	hasSession,
	children
}: PropsWithChildren<{ hasSession: boolean }>) {
	const { collection, _splat } = useParams({ strict: false }) as {
		collection: CollectionSlug | GlobalSlug
		_splat?: string
	}

	const state = resolveRouteView(collection, _splat, hasSession)

	return (
		<RouteViewContext.Provider value={state}>
			{children}
		</RouteViewContext.Provider>
	)
}

/**
 * `useSession()` (a real hook) is only ever called from this subtree once
 * `authClient` is known to exist — same "never conditionally *call* a hook,
 * only conditionally *mount* the component that calls it" shape
 * `topbar.tsx`'s own `SessionGreeting` already established for the exact
 * same `authClient | undefined` problem.
 */
function ProviderViewContextGated({
	authClient,
	children
}: PropsWithChildren<{ authClient: BetterAuthAdminClient }>) {
	const { data: session } = authClient.useSession()
	return (
		<ProviderViewContextResolved hasSession={Boolean(session)}>
			{children}
		</ProviderViewContextResolved>
	)
}

function ProviderViewContext({ children }: ProviderViewContextProps) {
	const authClient = getAuthClient()
	// No `auth` passed to `baseConfig()` at all — nothing to gate against,
	// same as this feature not existing.
	if (!authClient) {
		return (
			<ProviderViewContextResolved hasSession>
				{children}
			</ProviderViewContextResolved>
		)
	}
	return (
		<ProviderViewContextGated authClient={authClient}>
			{children}
		</ProviderViewContextGated>
	)
}

export const ProviderView: ProviderViewComponent = {
	Context: ProviderViewContext
}
