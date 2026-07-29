import { useMemo } from 'react'
import { collectionsBySlug, globalsBySlug } from '../../../collections/registry'
import { useAdminSession } from '../../functions/session-query'
import { useAdminConfig } from '../../functions/context'
import { LoginView } from '../auth'
import { RenderView } from '../render-view'

/**
 * `/admin` (bare index) is a route of its own — `admin/index.tsx` mounts
 * this directly, entirely separate from the `admin/$collection/$` catch-all
 * that `provider.tsx`'s `resolveRouteView` gates on session (see
 * `base/config/CLAUDE.md`'s "The admin session guard"). `Topbar` already
 * hides its own chrome with no session, but that alone doesn't stop
 * whatever's mounted as `<Outlet/>` from still rendering — this is the one
 * other real admin surface that needs the same "no session → show login"
 * treatment, using the same shared `useAdminSession()` read `Topbar`/
 * `ProviderView.Context` use (not an independent subscription — see that
 * hook's own doc comment). No `$collection` segment exists at this bare
 * path at all, so the fallback is unambiguous: `LoginView`, matching
 * `resolveRouteView`'s own default.
 */
export function Dashboard() {
	const { hasSession } = useAdminSession()
	if (!hasSession) return <LoginView />
	return <DashboardList />
}

function DashboardList() {
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

			{sections.map((section) => (
				<RenderView.List
					key={section.title}
					title={section.title}
					items={section.items}
				/>
			))}
		</RenderView>
	)
}
