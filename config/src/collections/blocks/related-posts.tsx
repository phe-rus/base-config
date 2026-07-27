import { z } from 'zod'
import { RelationGroupFields } from '../fields/relations-field'
import type { BlockConfig, BlockFieldsProps } from './types'

export const relatedPostsBlockSchema = z.object({
	blockType: z.literal('relatedPosts'),
	label: z.string().optional(),
	mode: z.enum(['manual', 'keyword']).optional(),
	ids: z.array(z.object({ id: z.string() })).optional(),
	keywords: z.array(z.string()).optional()
})

function RelatedPostsBlockFields({ form, path }: BlockFieldsProps) {
	return <RelationGroupFields form={form} path={path} />
}

export const relatedPostsBlock: BlockConfig = {
	slug: 'relatedPosts',
	label: 'Related posts',
	schema: relatedPostsBlockSchema,
	defaultValue: { label: undefined, mode: 'manual', ids: [], keywords: [] },
	Fields: RelatedPostsBlockFields
}
