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
			{
				title: 'Baseconfig - local first, edge native, tanstack, cloudflare cms'
			},
			{
				name: 'description',
				content:
					'The edge native, local first content management system for TanStack Start.'
			},
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ property: 'og:type', content: 'website' },
			{
				property: 'og:url',
				content: `${import.meta.env.VITE_ORIGIN}/`
			},
			{ property: 'og:site_name', content: 'Baseconfig' }
		],
		links: [
			{ rel: 'stylesheet', href: stylesheet },
			{ rel: 'shortcut-icon', type: 'image/x-icon', href: '/favicon.ico' },
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
			{ rel: 'icon', type: 'image/png', href: '/favicon.png' },
			{ rel: 'apple-touch-icon', href: '/favicon.png' },
			{ rel: 'apple-touch-icon-precomposed', href: '/favicon.png' },
			{ rel: 'canonical', href: `${import.meta.env.VITE_ORIGIN}/` }
		]
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
