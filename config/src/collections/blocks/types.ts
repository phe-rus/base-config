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
	/**
	 * A plain `string`, not `BlockSlug` — `BlockSlug` is this package's own
	 * closed list of *built-in* block slugs (still useful as a restriction
	 * hint on `BlocksFieldConfig['blocks']`), but `BlockConfig` itself also
	 * describes a *plugin's* own blocks (e.g.
	 * `@base/plugin-form-builder`'s `formBlock`), which by definition aren't
	 * members of this package's own union. See `registry.ts`'s
	 * `registerBlocks()`.
	 */
	slug: string
	label: string
	schema: z.ZodTypeAny
	defaultValue: Record<string, unknown>
	Fields: FC<BlockFieldsProps>
}
