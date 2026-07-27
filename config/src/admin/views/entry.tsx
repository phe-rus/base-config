import { useNavigate } from '@tanstack/react-router'
import { contentCollections } from '../../db/collections'
import { useAdminConfig } from '../functions/context'
import { CollectionForm } from './collection-form'
import { CollectionTable } from './collection-table'
import { useRouteView } from './context'
import { GlobalForm } from './global-form'
import { RenderView } from './render-view'

/**
 * The single dispatcher mounted at the `$collection/$` splat route —
 * replaces what used to be two separate route-mounted components (`List`
 * at `$collection/index.tsx`, `CollectionEdit` at `$collection/$uid.tsx`).
 * All the slug/uid resolution now happens once, upstream, in
 * `<ProviderView.Context>` (`provider.tsx`) — this file only renders
 * whichever mode `useRouteView()` reports.
 */
export function Entry() {
	const config = useAdminConfig()
	const navigate = useNavigate()
	const view = useRouteView()

	if (view.mode === 'not-found') {
		return (
			<RenderView.NotFound>
				Unknown collection or global "{view.slug}".
			</RenderView.NotFound>
		)
	}

	if (view.mode === 'custom') {
		const Custom = view.globalConfig.Fields
		return <Custom form={undefined} id={view.globalConfig.slug} />
	}

	if (view.mode === 'global') {
		return <GlobalForm config={view.globalConfig} id={view.globalConfig.slug} />
	}

	if (view.mode === 'edit') {
		return (
			<CollectionForm
				config={view.collectionConfig}
				collection={contentCollections[view.collectionConfig.slug]}
				id={view.uid}
			/>
		)
	}

	return (
		<CollectionTable
			config={view.collectionConfig}
			collection={contentCollections[view.collectionConfig.slug]}
			onOpen={(id) =>
				// resolved literal path, not a typed route pattern — same
				// trade-off `List` made before this file replaced it
				navigate({
					to: `/${config.adminPath}/${view.collectionConfig.slug}/${id}` as any
				})
			}
		/>
	)
}
