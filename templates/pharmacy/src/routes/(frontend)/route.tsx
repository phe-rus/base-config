import { Headers } from '@/components/headers'
import { base } from '@baseconfig/core'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)')({
	beforeLoad: async ({ context }) => {
		const lists = await context.query.ensureQueryData(
			base.find({ collection: 'products' })
		)
		return {
			lists: lists
		}
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
