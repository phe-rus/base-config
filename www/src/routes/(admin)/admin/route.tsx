import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin')({
	component: RouteComponent
})

function RouteComponent() {
	return <Outlet />
}
