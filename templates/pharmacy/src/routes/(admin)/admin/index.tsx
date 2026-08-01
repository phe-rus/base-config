import { ContextView } from '@baseconfig/core/admin'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/')({
	component: () => <ContextView.Dashboard />
})
