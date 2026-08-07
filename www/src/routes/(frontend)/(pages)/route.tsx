import { Topbar } from '@/components/topbar'
import { base } from '@baseconfig/core'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/(pages)')({
	loader: async ({ context }) => {
		await context.query.prefetchQuery(base.find({ collection: 'pages' }))
		await context.query.prefetchQuery(base.findGlobal({ slug: 'topbar' }))
	},
	component: RouteComponent
})

function RouteComponent() {
	return (
		<>
			<Topbar />
			<Outlet />
		</>
	)
}
