import type { FC } from 'react'
import type { z } from 'zod'

export type BlockSlug =
	| 'richtext'
	| 'media'
	| 'cta'
	| 'banner'
	| 'grid'
	| 'columns'
	| 'relatedPosts'

export type BlockFieldsProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts` — same reasoning applies here. */
	form: any
	path: string
}

export type BlockConfig = {
	slug: BlockSlug
	label: string
	schema: z.ZodTypeAny
	defaultValue: Record<string, unknown>
	Fields: FC<BlockFieldsProps>
}
