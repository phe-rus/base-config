import type { FC } from 'react'
import { z } from 'zod'
import type { FieldConfig } from '../../../fields/types'
import type { GeneratedBlockSlug } from '../../../base.types'

export type BlockFieldsProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts`, same reasoning applies here. */
	form: any
	path: string
	/**
	 * The owning collection/global's own `slug` and the current document's
	 * own `id`, together, what a block's own `f.Upload` field needs to
	 * build a real, collision-free storage prefix (see `fields/renderer.tsx`'s
	 * generic `case 'upload'` for the exact pattern every block wiring one
	 * up should match). Threaded down from `renderField`'s own `meta`-case
	 * precedent (`renderer.tsx`) through `BlocksField`, optional because
	 * most blocks never touch storage at all and can ignore both.
	 */
	uploadFolder?: string
	id?: string
}

export type BlockConfig = {
	/**
	 * A plain `string`, not a closed union: this package ships no built-in
	 * blocks, every slug comes from the consumer's or a plugin's own
	 * `defineBlock` call, so there's nothing for a static union to enumerate.
	 * See `registry.ts`'s `registerBlocks()`.
	 */
	slug: string
	/** Always present on the resolved config: `defineBlock` fills it from `labelFromSlug(slug)` when the author's `BlockDefinition` omits it, the same optional-label rule `defineCollection`/`defineGlobal` use (`../define.ts`). */
	label: string
	/**
	 * Payload's `interfaceName`
	 * (https://payloadcms.com/docs/fields/blocks): override the name of the
	 * top-level TypeScript interface `base gen` emits for this block in a
	 * consumer's `base.types.ts`. Every block always gets one, auto-derived
	 * as a PascalCase form of the slug when omitted (`'relatedPosts'` ->
	 * `RelatedPosts`), so an explicit name only matters when you want it
	 * human-`import`able and stable by choice rather than by accident, or to
	 * sidestep the collision suffix `db/content-types-schema.ts` applies to
	 * two *auto-derived* names that resolve to the same string. Explicit
	 * names are used verbatim and are the consumer's own job to keep unique,
	 * matching Payload's rule.
	 */
	interfaceName?: string
	/**
	 * Payload's `group` (https://payloadcms.com/docs/fields/blocks#group):
	 * a heading the "Pick block" dialog sorts this block under. Omit to
	 * place the block in the dialog's ungrouped first section.
	 */
	group?: string
	/**
	 * Payload's `disableBlockName`
	 * (https://payloadcms.com/docs/fields/blocks#blockname): hides the
	 * per-instance "Block name" input in `BlocksField` for blocks whose
	 * instances don't benefit from a custom label. Every block's schema and
	 * generated union member still *accepts* an optional `blockName`, the
	 * flag only controls whether the admin UI surfaces an editor for it, so
	 * round-tripping older data that never carried one stays valid either
	 * way.
	 */
	disableBlockName?: boolean
	/**
	 * The block's own field vocabulary, the same `FieldConfig[]` shape
	 * `defineGlobal` takes, and the single source of truth for three derived
	 * things: `schema` and `defaultValue` (derived by `defineBlock`,
	 * `shared/define-block.tsx`, through `fieldsToSchema`/
	 * `deriveDefaultValues`) and the block's own named interface in the
	 * generated `ContentBlock` union `base gen` emits into a consumer's
	 * `base.types.ts` (`db/content-types-schema.ts`'s `case 'blocks'`). A
	 * plugin author hands these to `defineBlock` and never builds a
	 * `BlockConfig` by hand. `GeneratedBlockSlug` here for the same reason
	 * `BlockDefinition['fields']` carries it (`shared/define-block.tsx`): a
	 * nested `blocks` field (a `grid`-style block's `items`) gets
	 * restriction-list autocomplete against the consumer's registered slugs.
	 */
	fields: FieldConfig<string, GeneratedBlockSlug>[]
	schema: z.ZodTypeAny
	defaultValue: Record<string, unknown>
	/**
	 * The block's admin editor. Always present on the resolved config:
	 * `defineBlock` derives one from `fields` when the author's
	 * `BlockDefinition` omits it (`shared/define-block.tsx`'s
	 * `deriveBlockFields`, the same generic `renderField` dispatch
	 * collections/globals use), so a standard block's `fields` array is its
	 * entire authoring surface and no consumer `Fields.tsx` exists.
	 */
	Fields: FC<BlockFieldsProps>
	/**
	 * The *default* public-facing markup for this block, optional, alongside
	 * the always-present (derived when the author omits it) admin-only
	 * `Fields`. Nothing in this package
	 * dispatches it: public block rendering is a consumer-owned design
	 * concern (Payload-style), the consumer writes their own renderer that
	 * switches on `blockType` and renders their own components, using these
	 * defaults only if they want to (reachable via `blocksBySlug[slug].Render`).
	 * A block with no `Render` simply has no default, which is fine for
	 * authoring-only blocks (`media`). Takes the block's own raw stored
	 * value (`{blockType, ...}`, whatever `schema` describes), never
	 * `form`/`path`, since there's no form on a public page.
	 */
	Render?: FC<{ data: Record<string, unknown> }>
	/**
	 * Shown in the "Pick block" picker (`fields/BlocksField/index.tsx`), a
	 * plain `@tabler/icons-react` component (matching this app's
	 * icon-only convention throughout `packages/ui`/`packages/config`), not a
	 * Payload-style uploaded image/URL; this app has no per-block asset
	 * pipeline and doesn't need one at its current block count. Falls
	 * back to a generic placeholder icon when omitted (e.g. a
	 * third-party plugin block that hasn't set one).
	 */
	Icon?: FC<{ className?: string }>
}
