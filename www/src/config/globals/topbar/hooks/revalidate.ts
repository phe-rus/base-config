import type { CollectionAfterChangeHook } from '@baseconfig/core'
import { purgeEdgeCache } from '@baseconfig/core/api'
import type { Topbar } from '@/config/base.types'

export const revalidateTopbar: CollectionAfterChangeHook<Topbar> = async ({
	find,
	origin
}) => {
	if (!origin) return

	const [docsResult, pagesResult] = await Promise.all([
		find('docs', { publishedOnly: true, limit: 1000 }),
		find('pages', { publishedOnly: true, limit: 1000 })
	])

	const docPaths = docsResult.docs
		.filter((doc) => doc.slug)
		.map((doc) => `/docs/${doc.slug}`)
	const pagePaths = pagesResult.docs
		.filter((page) => page.slug)
		.map((page) => (page.slug === 'home' ? '/' : `/${page.slug}`))

	await purgeEdgeCache(origin, ['/docs', '/docs/', ...docPaths, ...pagePaths])
}
