import { Headers } from '@/components/headers'
import { base } from '@baseconfig/core'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)')({
	loader: ({ context }) => {
		context.query.ensureQueryData(base.find({ collection: 'products' }))
	},
	component: RouteComponent
})

function RouteComponent() {
	return (
		<>
			<Headers />
			<Outlet />
		</>
	)
}
