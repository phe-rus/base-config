import { useParams } from '@tanstack/react-router'
import type { PropsWithChildren, ReactNode } from 'react'
import { collectionsBySlug, globalsBySlug } from '../../collections/registry'
import type { CollectionSlug, GlobalSlug } from '../../collections/types'
import { RouteViewContext } from './context'
import type { RouteViewState } from './context'

type ProviderViewContextProps = PropsWithChildren

type ProviderViewComponent = {
	Context: (props: ProviderViewContextProps) => ReactNode
}

function resolveRouteView(
	slug: CollectionSlug | GlobalSlug,
	splat: string | undefined
): RouteViewState {
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
function ProviderViewContext({ children }: ProviderViewContextProps) {
	const { collection, _splat } = useParams({ strict: false }) as {
		collection: CollectionSlug | GlobalSlug
		_splat?: string
	}

	const state = resolveRouteView(collection, _splat)

	return (
		<RouteViewContext.Provider value={state}>
			{children}
		</RouteViewContext.Provider>
	)
}

export const ProviderView: ProviderViewComponent = {
	Context: ProviderViewContext
}
