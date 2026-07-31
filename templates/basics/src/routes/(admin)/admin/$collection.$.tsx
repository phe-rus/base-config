import { ContextView, ProviderView } from '@baseconfig/core/admin'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/$collection/$')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProviderView.Context>
			<ContextView.Entry />
		</ProviderView.Context>
	)
}
