import { createFileRoute } from '@tanstack/react-router'
import { collectionPath } from '@baseconfig/core/collections/types'
import { baseApi } from '@/config/api'

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: async () => {
				const origin =
					import.meta.env.VITE_ORIGIN || 'https://baseconfig.pherus.org'

				const [{ docs }, { docs: pages }] = await Promise.all([
					baseApi.find({
						collection: 'docs',
						publishedOnly: true,
						limit: 1000
					}),
					baseApi.find({
						collection: 'pages',
						publishedOnly: true,
						limit: 1000
					})
				])

				const urls = [
					`${origin}/`,
					`${origin}/docs`,
					`${origin}/docs/`,
					...docs
						.filter((doc) => doc.slug)
						.map((doc) => `${origin}/docs/${doc.slug}`),
					...pages
						.filter((page) => page.slug && page.slug !== 'home')
						.map(
							(page) => `${origin}${collectionPath({}, page.slug as string)}`
						)
				]

				const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')}
</urlset>`

				return new Response(xml, {
					headers: {
						'Content-Type': 'application/xml; charset=utf-8',
						'Cache-Control': 'public, max-age=3600, s-maxage=3600'
					}
				})
			}
		}
	}
})
