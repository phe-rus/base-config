import { cn } from '@/lib/cn'
import stylesheet from '@/styles/globals.css?url'
import { Toaster } from '@baseconfig/ui/components/sonner'
import { ThemeProvider } from '@baseconfig/ui/themes'
import type { QueryClient } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts
} from '@tanstack/react-router'

export interface RouterAppContext {
	query: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Basics - Baseconfig Templete reference app' }
		],
		links: [{ rel: 'stylesheet', href: stylesheet }]
	}),
	shellComponent: RootDocument
})

function RootDocument() {
	return (
		<html lang='en' className='antialiased blur-none' suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body
				className={cn(
					'relative min-h-dvh min-w-full border bg-background wrap-anywhere',
					'selection:bg-olive-500/15 overflow-x-hidden duration-200',
					'typeset'
				)}
			>
				<ThemeProvider attribute='class'>
					<Outlet />
					<Toaster richColors position='bottom-right' />
					<Scripts />
				</ThemeProvider>
			</body>
		</html>
	)
}
