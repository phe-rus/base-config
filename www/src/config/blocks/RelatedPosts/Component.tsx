import type { FC } from 'react'

/**
 * The `relatedPosts` block targets www's `pages` collection. Implement this
 * (fetch published pages, filter by `mode`/`ids`/`keywords`) when the block
 * is given a public rendering.
 */
export const RelatedPostsBlock: FC<{
	label?: string
	mode?: string
	ids?: string[]
	keywords?: string[]
}> = () => {
	return null
}
