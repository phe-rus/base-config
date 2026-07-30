import '@/styles/globals.css'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'
import { getContext, TRProvider } from './utils/query'

export function getRouter() {
	const query = getContext()
	const router = createTanStackRouter({
		context: {
			query: query
		},
		defaultPreload: 'intent',
		routeTree,
		scrollRestoration: true,
		Wrap: ({ children }) => {
			return <TRProvider query={query}>{children}</TRProvider>
		}
	})

	setupRouterSsrQueryIntegration({
		queryClient: query,
		router: router
	})

	return router
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
