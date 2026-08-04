import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/(pages)/docs')({
	component: RouteComponent
})

function RouteComponent() {
	return <Outlet />
}
