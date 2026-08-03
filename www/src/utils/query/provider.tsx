import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren, useMemo } from 'react'

type TRProviderProps = PropsWithChildren<{
	query: QueryClient
}>

export const TRProvider = ({ children, query }: TRProviderProps) => {
	const client = useMemo(() => query, [query])
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
