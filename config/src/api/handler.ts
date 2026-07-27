import type { Hono } from 'hono'

type HandlerProps = {
	request: Request
}

const methods = [
	'GET',
	'POST',
	'PUT',
	'DELETE',
	'PATCH',
	'OPTIONS',
	'HEAD'
] as const

export const Handler = (app: Hono<any, any, any>) => {
	const handler = ({ request }: HandlerProps) => {
		return app.fetch(request)
	}
	return Object.fromEntries(
		methods.map((method) => {
			return [method, handler]
		})
	)
}
