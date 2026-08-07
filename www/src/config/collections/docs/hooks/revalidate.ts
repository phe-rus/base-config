import type {
	CollectionAfterChangeHook,
	CollectionAfterDeleteHook
} from '@baseconfig/core'
import { purgeEdgeCache } from '@baseconfig/core/api'
import type { Docs } from '@/config/base.types'

export const revalidateDocs: CollectionAfterChangeHook<Docs> = async ({
	operation,
	slug,
	previousSlug,
	origin
}) => {
	if (!origin) return

	await purgeEdgeCache(origin, ['/docs', '/docs/'])
	if (slug) await purgeEdgeCache(origin, [`/docs?slug=${slug}`])

	if (operation === 'update' && previousSlug && previousSlug !== slug) {
		await purgeEdgeCache(origin, [`/docs?slug=${previousSlug}`])
	}
}

export const revalidateDocsDelete: CollectionAfterDeleteHook<Docs> = async ({
	slug,
	origin
}) => {
	if (!origin) return

	await purgeEdgeCache(origin, ['/docs', '/docs/'])
	if (slug) await purgeEdgeCache(origin, [`/docs?slug=${slug}`])
}
