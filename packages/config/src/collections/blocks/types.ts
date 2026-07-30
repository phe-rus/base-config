import type { FC } from 'react'
import type { z } from 'zod'

export type BlockSlug =
	| 'richtext'
	| 'media'
	| 'cta'
	| 'banner'
	| 'grid'
	| 'code'
	| 'relatedPosts'

export type BlockFieldsProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts` — same reasoning applies here. */
	form: any
	path: string
	/**
	 * The owning collection/global's own `slug` and the current document's
	 * own `id` — together, what a block's own `f.Upload` field needs to
	 * build a real, collision-free storage prefix (see `fields/renderer.tsx`'s
	 * generic `case 'upload'` for the exact pattern every block wiring one
	 * up should match). Threaded down from `renderField`'s own `meta`-case
	 * precedent (`renderer.tsx`) through `BlocksField` — optional because
	 * most blocks never touch storage at all and can ignore both.
	 */
	uploadFolder?: string
	id?: string
}

export type BlockConfig = {
	/**
	 * A plain `string`, not `BlockSlug` — `BlockSlug` is this package's own
	 * closed list of *built-in* block slugs (still useful as a restriction
	 * hint on `BlocksFieldConfig['blocks']`), but `BlockConfig` itself also
	 * describes a *plugin's* own blocks (e.g.
	 * `@baseconfig/plugin-form-builder`'s `formBlock`), which by definition aren't
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
	/**
	 * Shown in the "Pick block" picker (`fields/blocks-field.tsx`) — a
	 * plain `@tabler/icons-react` component (matching this app's
	 * icon-only convention throughout `packages/ui`/`packages/config`), not a
	 * Payload-style uploaded image/URL; this app has no per-block asset
	 * pipeline and doesn't need one at its current block count. Falls
	 * back to a generic placeholder icon when omitted (e.g. a
	 * third-party plugin block that hasn't set one).
	 */
	Icon?: FC<{ className?: string }>
}
