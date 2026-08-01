import baseConfig from '@/config/base.config'
import { Topbar } from '@baseconfig/core/admin'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<Topbar config={baseConfig.config}>
			<Outlet />
		</Topbar>
	)
}
