import type { CollectionBeforeChangeHook } from '@baseconfig/core'
import type { Docs } from '@/config/base.types'

export const stampAuthor: CollectionBeforeChangeHook<Docs> = ({
	operation,
	data,
	req
}) => {
	if (operation !== 'create' || data.author?.id) return data
	if (!req.user) return data
	return {
		...data,
		author: {
			id: req.user.id,
			name: req.user.name,
			email: req.user.email,
			image: req.user.image ?? undefined
		}
	}
}
