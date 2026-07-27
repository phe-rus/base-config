import { useMemo } from 'react'
import { collectionsBySlug, globalsBySlug } from '../../../collections/registry'
import { pluginAdminSlots } from '../../../plugins/registry'
import { useAdminConfig } from '../../functions/context'
import { RenderView } from '../render-view'

/**
 * The admin dashboard landing page — lists every registered
 * collection/global as a link. Fully generic: a consumer mounts this
 * directly as a route's `component`, no wrapper needed (see
 * `admin/functions/context.ts` for how `config` reaches this without prop-drilling).
 */
export function Dashboard() {
	const config = useAdminConfig()

	const sections = useMemo(
		() => [
			{
				title: 'Collections',
				items: Object.values(collectionsBySlug).map((c) => ({
					key: c.slug,
					label: c.label,
					colors: c.color,
					href: `/${config.adminPath}/${c.slug}`
				}))
			},
			{
				title: 'Preferences',
				items: Object.values(globalsBySlug).map((g) => ({
					key: g.slug,
					label: g.label,
					colors: undefined,
					href: `/${config.adminPath}/${g.slug}`
				}))
			}
		],
		[config, globalsBySlug, collectionsBySlug]
	)

	return (
		<RenderView>
			<RenderView.Header title='Pherus'>
				<p className='md:max-w-sm'>Manage everything from one place.</p>
			</RenderView.Header>

			{pluginAdminSlots.beforeDashboard.map((Slot, index) => (
				<Slot key={index} />
			))}

			{sections.map((section) => (
				<RenderView.List
					key={section.title}
					title={section.title}
					items={section.items}
				/>
			))}

			{pluginAdminSlots.afterDashboard.map((Slot, index) => (
				<Slot key={index} />
			))}
		</RenderView>
	)
}
