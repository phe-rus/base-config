import { Topbar } from '@/components/topbar'
import { base } from '@baseconfig/core'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)')({
	beforeLoad: async ({ context }) => {
		await context.query.ensureQueryData(base.findGlobal({ slug: 'topbar' }))
		await context.query.ensureQueryData(base.find({ collection: 'pages' }))
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
