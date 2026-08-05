import { createFileRoute, Outlet } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/(frontend)/(pages)/docs')({
	validateSearch: z.object({
		slug: z.string().optional()
	}),
	component: RouteComponent
})

function RouteComponent() {
	return <Outlet />
}
