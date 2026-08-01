import { createFileRoute } from '@tanstack/react-router'
import { Handler } from '@baseconfig/core/api'
import app from '@/config/api'

export const Route = createFileRoute('/(admin)/api/$')({
	server: {
		handlers: Handler(app)
	}
})
