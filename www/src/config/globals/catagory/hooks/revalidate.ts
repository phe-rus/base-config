import type { CollectionAfterChangeHook } from '@baseconfig/core'
import { purgeEdgeCache } from '@baseconfig/core/api'
import type { Category } from '@/config/base.types'

export const revalidateCategory: CollectionAfterChangeHook<Category> = async ({
	find,
	origin
}) => {
	if (!origin) return

	const { docs } = await find('docs', { publishedOnly: true, limit: 1000 })
	const docPaths = docs
		.filter((doc) => doc.slug)
		.map((doc) => `/docs/${doc.slug}`)

	await purgeEdgeCache(origin, ['/docs', '/docs/', ...docPaths])
}
