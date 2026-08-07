import { createFileRoute } from '@tanstack/react-router'

interface UserAgentRule {
	userAgent: string
	allow?: string[]
	disallow?: string[]
}

interface RobotsConfig {
	rules: UserAgentRule[]
	sitemap?: string
}

export const Route = createFileRoute('/robots.txt')({
	server: {
		handlers: {
			GET: async () => {
				const origin = import.meta.env.VITE_ORIGIN || 'https://example.com'

				const config: RobotsConfig = {
					rules: [
						{
							userAgent: '*',
							allow: ['/'],
							disallow: ['/admin', '/api']
						}
					],
					sitemap: `${origin}/sitemap.xml`
				}

				const lines: string[] = []

				config.rules.forEach((rule) => {
					lines.push(`User-agent: ${rule.userAgent}`)
					rule.allow?.forEach((path) => lines.push(`Allow: ${path}`))
					rule.disallow?.forEach((path) => lines.push(`Disallow: ${path}`))
					lines.push('') // Line break between agent blocks
				})

				if (config.sitemap) {
					lines.push(`Sitemap: ${config.sitemap}`)
				}

				const content = lines.join('\n').trim()

				return new Response(content, {
					headers: {
						'Content-Type': 'text/plain; charset=utf-8',
						'Cache-Control': 'public, max-age=86400, s-maxage=86400'
					}
				})
			}
		}
	}
})
