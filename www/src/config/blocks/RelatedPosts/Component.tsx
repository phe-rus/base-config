import type { FC } from 'react'

/**
 * The `relatedPosts` block targets a `posts` collection, which www doesn't
 * have yet, so it renders nothing for now. Implement this (fetch published
 * posts, filter by `mode`/`ids`/`keywords`) when www gains a posts
 * collection.
 */
export const RelatedPostsBlock: FC<{
	label?: string
	mode?: string
	ids?: { id?: string }[]
	keywords?: string[]
}> = () => {
	return null
}
