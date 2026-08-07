import type {
	CollectionAfterChangeHook,
	CollectionAfterDeleteHook
} from '@baseconfig/core'
import { purgeEdgeCache } from '@baseconfig/core/api'
import type { Pages } from '@/config/base.types'

export const revalidatePage: CollectionAfterChangeHook<Pages> = async ({
	operation,
	slug,
	previousSlug,
	origin
}) => {
	if (!origin) return

	if (slug) {
		const path = slug === 'home' ? '/' : `/${slug}`
		await purgeEdgeCache(origin, [path])
	}

	if (operation === 'update' && previousSlug && previousSlug !== slug) {
		const oldPath = previousSlug === 'home' ? '/' : `/${previousSlug}`
		await purgeEdgeCache(origin, [oldPath])
	}
}

export const revalidatePageDelete: CollectionAfterDeleteHook<Pages> = async ({
	slug,
	origin
}) => {
	if (!slug || !origin) return
	const path = slug === 'home' ? '/' : `/${slug}`
	await purgeEdgeCache(origin, [path])
}
