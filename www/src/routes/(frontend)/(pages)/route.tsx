import { Topbar } from '@/components/topbar'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/(pages)')({
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
