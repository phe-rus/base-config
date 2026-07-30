import { ContextView } from '@baseconfig/core/admin'
import { createFileRoute } from '@tanstack/react-router'

const { Dashboard } = ContextView

export const Route = createFileRoute('/(admin)/admin/')({
	component: Dashboard
})
