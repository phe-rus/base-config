import { RelationGroupFields, type BlockFieldsProps } from '@baseconfig/core'
import type { FC } from 'react'

/** One relation group on its own: this block *is* a single group rather than a picker over an array of them. */
export const RelatedPostsBlockFields: FC<BlockFieldsProps> = ({
	form,
	path
}) => {
	return <RelationGroupFields form={form} path={path} />
}
