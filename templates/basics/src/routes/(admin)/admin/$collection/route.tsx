import { ProviderView } from '@baseconfig/core/admin'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/$collection')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProviderView.Context>
			<Outlet />
		</ProviderView.Context>
	)
}
