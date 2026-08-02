import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/shop')({
	component: RouteComponent
})

function RouteComponent() {
	return <Outlet />
}
