import '@/styles/globals.css'
// Side-effect only: `baseConfig()` (called by this import) registers the
// content data source (`registerContentDataSource()`), which any component
// calling `base.find`/`base.findGlobal` needs to already have run. Only the
// admin route and the server API entry imported this before, so a *public*
// route rendering before either of those had a real, confirmed bug: "A
// content collection was rendered before registerContentDataSource() was
// called." `router.tsx` is the one module both SSR and the client always
// evaluate first, so importing it here closes that gap unconditionally, the
// client-side counterpart to the server-side ordering fix already
// documented in `@baseconfig/core`'s own `db/CLAUDE.md`.
import '@/config/base.config'
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
