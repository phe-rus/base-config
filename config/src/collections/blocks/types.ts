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
	/**
	 * The public-facing markup for this block — optional, alongside the
	 * always-required admin-only `Fields`. A block with no `Render` is
	 * simply skipped by `BlockRenderer` (`./block-renderer.tsx`), so a
	 * block's public half can ship incrementally, one block at a time,
	 * without breaking the ones that don't have one yet. Takes the block's
	 * own raw stored value (`{blockType, ...}`, whatever `schema` describes)
	 * — never `form`/`path`, since there's no form on a public page.
	 */
	Render?: FC<{ data: Record<string, unknown> }>
}
