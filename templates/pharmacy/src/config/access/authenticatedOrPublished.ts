import type { ReadAccess } from '@baseconfig/core'

export const authenticatedOrPublished: ReadAccess = ({ req: { user } }) => {
	if (user) return true

	return { status: { equals: 'published' } }
}
