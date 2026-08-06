import baseConfig from '@/config/base.config'
import { Topbar } from '@baseconfig/core/admin'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)')({
	head: () => ({
		// Admin shouldn't be indexed
		meta: [
			{ title: 'Admin - Baseconfig' },
			{ name: 'robots', content: 'noindex, nofollow' },
			{ name: 'googlebot', content: 'noindex, nofollow' },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:url', content: `${import.meta.env.VITE_ORIGIN}/admin` },
			{ property: 'og:site_name', content: 'Baseconfig' },
			{ property: 'og:title', content: 'Admin - Baseconfig' },
			{ property: 'og:description', content: 'Admin - Baseconfig' },
			{ name: 'twitter:title', content: 'Admin - Baseconfig' },
			{ name: 'twitter:description', content: 'Admin - Baseconfig' },
			// using the same favicon as the frontend
			{
				property: 'og:image',
				content: `${import.meta.env.VITE_ORIGIN}/favicon.png`
			},
			{
				name: 'twitter:image',
				content: `${import.meta.env.VITE_ORIGIN}/favicon.png`
			}
		],
		links: [
			{ rel: 'canonical', href: `${import.meta.env.VITE_ORIGIN}/admin` },
			{ rel: 'shortcut-icon', type: 'image/x-icon', href: '/favicon.png' },
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.png' },
			{ rel: 'icon', type: 'image/png', href: '/favicon.png' },
			{ rel: 'apple-touch-icon', href: '/favicon.png' },
			{ rel: 'apple-touch-icon-precomposed', href: '/favicon.png' }
		]
	}),
	component: RouteComponent
})

function RouteComponent() {
	return (
		<Topbar config={baseConfig.config}>
			<Outlet />
		</Topbar>
	)
}
