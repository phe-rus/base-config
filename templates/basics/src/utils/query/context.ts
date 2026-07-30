import { t } from '@baseconfig/ui/components/sonner'
import { QueryCache, QueryClient } from '@tanstack/react-query'

let query: QueryClient | undefined

export const queryContext = () => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				networkMode: 'offlineFirst',
				retry: 0
			}
		},
		queryCache: new QueryCache({
			onError: (error) => {
				if (error.name === 'AbortError') return
				t.error(error.name ?? 'Error', { description: error.message })
			}
		})
	})
}

export function getContext(): QueryClient {
	if (typeof window !== 'undefined') {
		if (!query) query = queryContext()
		return query
	}
	return queryContext()
}
