import { createContext, useContext } from 'react'
import type { CollectionConfig, GlobalConfig } from '../../collections/types'

export type RouteViewState =
	| { mode: 'list'; collectionConfig: CollectionConfig }
	| { mode: 'edit'; collectionConfig: CollectionConfig; uid: string }
	| { mode: 'global'; globalConfig: GlobalConfig }
	| { mode: 'custom'; globalConfig: GlobalConfig }
	| { mode: 'not-found'; slug: string }
	// No session at all — `login`/`create-account`/`forgot-password`/
	// `reset-password` are reserved `$collection` values `provider.tsx`'s
	// `resolveRouteView` resolves to one of these *before* ever looking
	// slug up against `collectionsBySlug`/`globalsBySlug`, same dispatcher
	// as every real collection/global, no separate route files.
	| { mode: 'login' }
	| { mode: 'create-account' }
	| { mode: 'forgot-password' }
	| { mode: 'reset-password' }

export const RouteViewContext = createContext<RouteViewState | null>(null)

/**
 * Reads the collection/global state resolved once by `<ProviderView.Context>`
 * (the `$collection`-segment layout route, see `provider.tsx`) — every mode
 * the `$collection/$` splat route (`entry.tsx`) can dispatch on, resolved
 * upstream instead of re-derived per view. Throws outside the provider, same
 * guard shape as `useAdminConfig` (`functions/context.ts`).
 */
export function useRouteView(): RouteViewState {
	const state = useContext(RouteViewContext)
	if (!state) {
		throw new Error(
			'useRouteView() called outside of <ProviderView.Context> — every $collection route must render below it.'
		)
	}
	return state
}
