import type { FC } from 'react'
import { z } from 'zod'
import type { GeneratedBlockSlug } from '../../../base.types'
import { renderField, type FieldRenderers } from '../../../fields/renderer'
import {
	deriveDefaultValues,
	fieldsToSchema,
	type FieldSchemaResolvers
} from '../../../fields/schema'
import type { FieldConfig } from '../../../fields/types'
import { BlocksField } from '../../fields/BlocksField'
import { LinksField } from '../../fields/Links'
import { MetaFields } from '../../fields/MetaFields'
import { NavMenuField } from '../../fields/NavMenu'
import { RelationshipField } from '../../fields/Relationship'
import { labelFromSlug } from '../../slug'
import { linksSchema } from '../../types'
import { getBlocksSchema } from '../registry'
import type { BlockConfig, BlockFieldsProps } from './types'

/**
 * The block counterpart to `define.ts`'s `schemaResolvers`: only the
 * composite field types blocks actually use are wired to their real shapes
 * here, everything else falls back to `baseFieldSchema`'s own defaults
 * (`fields/schema.ts`). `blocks` is deliberately `z.lazy(...)`, the exact
 * same reason `define.ts`'s own resolver is: this module is evaluated
 * *while* `registry.ts` is still building `blocksBySlug` (registry imports
 * each block, each block imports this module, this module imports the
 * registry), so the full block union must be deferred to first validation,
 * never read at module scope. `grid`'s nested `items` blocks field is the
 * real consumer today.
 */
const blockSchemaResolvers: FieldSchemaResolvers = {
	// A function, not the lazy itself: `case 'blocks'` calls it with the
	// field's own `blocks` restriction list, so a nested `blocks` field that
	// opts into a subset of the registry validates against just that subset.
	blocks: (slugs) => z.lazy(() => getBlocksSchema(slugs)),
	links: linksSchema
}

/**
 * The composite field renderers `define.ts` wires for collections/globals,
 * resolved lazily at first render, never module-eval: these components live
 * *below* the blocks subtree (`BlocksField` reads back through the blocks
 * barrel, which re-exports this module), so importing them is fine, but
 * reading one during this module's own evaluation would be order-dependent
 * on whichever module got imported first. Building the map inside a function
 * that only runs once a block actually renders defers every read to call
 * time, when the whole graph is loaded.
 */
let blockRenderersCache: FieldRenderers<any> | undefined
function blockFieldRenderers(): FieldRenderers<any> {
	return (blockRenderersCache ??= {
		meta: MetaFields,
		blocks: BlocksField,
		relationship: RelationshipField,
		menu: NavMenuField,
		links: LinksField
	})
}

/**
 * The default admin editor for a block, derived straight from its `fields`
 * array: renders each field through the same generic `renderField` dispatch
 * collections/globals use (`fields/renderer.tsx`), prefixed by the block
 * instance's own `path` (`content.3`), so a block whose form is nothing but
 * its declared fields needs no hand-written `Fields` at all, `fields` stays
 * the single source of truth, the same reason `defineCollection`/
 * `defineGlobal` derive their own `Fields`. `renderField` covers every leaf
 * type (`richtext`, `upload` with its own `prefix`, `select`, ...) and the
 * composite types (`links`, `blocks` with `exclude`, ...), so
 * only a genuinely custom editor (a `code` block's sibling-driven language
 * toggle, a `relatedPosts`-style relation group) supplies `Fields` anymore.
 */
function deriveBlockFields(
	fields: FieldConfig<string, string>[]
): FC<BlockFieldsProps> {
	return function GeneratedBlockFields({ form, path, uploadFolder, id }) {
		return (
			<div className='flex flex-col gap-3'>
				{fields.map((field, index) =>
					renderField(
						field,
						form,
						path,
						// `renderField`'s `id` is a real `string` (it feeds the
						// upload-folder path), the block's is optional; an
						// empty string is filtered out by the same
						// `.filter(Boolean)` the folder path already uses.
						id ?? '',
						blockFieldRenderers(),
						uploadFolder,
						index
					)
				)}
			</div>
		)
	}
}

export type BlockDefinition<TSlug extends string> = {
	slug: TSlug
	/** Shown in the "Pick block" picker, see `BlockConfig['label']` (`./types.ts`). Derived from `slug` via `labelFromSlug()` if omitted, `slug` is the one required identity, `label` is just its display form, the same rule `defineCollection`/`defineGlobal` use. */
	label?: string
	/** See `BlockConfig['interfaceName']` (`./types.ts`). */
	interfaceName?: string
	/** See `BlockConfig['group']` (`./types.ts`). */
	group?: string
	/** See `BlockConfig['disableBlockName']` (`./types.ts`). */
	disableBlockName?: boolean
	/** The block's own field vocabulary, see `BlockConfig['fields']` (`./types.ts`). `GeneratedBlockSlug` here for the same reason `CollectionDefinition['tabs']` carries it: a nested `blocks` field (a `grid`-style block's `items`) gets restriction-list autocomplete against the consumer's registered slugs. */
	fields: FieldConfig<string, GeneratedBlockSlug>[]
	/**
	 * Override for a block whose real validation can't be expressed as
	 * plain `fields` (e.g. a plugin block validating a reference against a
	 * refined schema, see `@baseconfig/plugin-form-builder`'s `formBlock`).
	 * Must *not* include `blockType`, `defineBlock` injects
	 * `blockType: z.literal(slug)` on top of whatever this is; `fields`
	 * still drives the generated TS type, so a tighter `schema` than the
	 * derived one is fine, a looser shape than `fields` will surface at
	 * typegen time.
	 */
	schema?: z.ZodObject<any>
	/** Override when the derived defaults don't match what this block should start as. */
	defaultValue?: Record<string, unknown>
	/**
	 * The block's admin editor, optional: omitted, `defineBlock` derives one
	 * straight from `fields`, each field rendered through the same generic
	 * dispatch collections/globals use, prefixed by the block instance's own
	 * `path` (see `deriveBlockFields`), so a standard block's `fields` array
	 * is the entire authoring surface and no consumer `Fields.tsx` exists.
	 * Only supply one for a genuinely custom editor the generic dispatch
	 * can't express, e.g. a `code` block whose corner language toggle drives
	 * a sibling field.
	 */
	Fields?: FC<BlockFieldsProps>
	/** See `BlockConfig['Render']` (`./types.ts`). */
	Render?: FC<{ data: Record<string, unknown> }>
	/** See `BlockConfig['Icon']` (`./types.ts`). */
	Icon?: FC<{ className?: string }>
}

/**
 * The block counterpart to `defineCollection`/`defineGlobal` (`define.ts`):
 * `{slug, label, fields}` derives `schema` (through `fieldsToSchema`, with
 * `blockType: z.literal(slug)` auto-injected so an author never writes the
 * discriminant by hand), `defaultValue` (through `deriveDefaultValues`),
 * and, when `Fields` is omitted, the admin `Fields` itself (through the
 * generic `renderField` dispatch, see `deriveBlockFields`), and `fields` is
 * also what `base gen`'s type generator walks
 * (`db/content-types-schema.ts`) to emit this block's member of a
 * consumer's generated `base.types.ts` (each block becomes its own named
 * interface, combined into the `ContentBlock` union, see
 * `db/content-types-schema.ts`'s `blocksUnionSource`). Generic over `TSlug` for the
 * same reason `defineCollection` is, see that function's own doc comment:
 * a plugin package that can't reference this app's built-in block slugs
 * calls it with its own literal slug and gets a `BlockConfig` typed
 * to just that slug back.
 */
export function defineBlock<TSlug extends string>(
	definition: BlockDefinition<TSlug>
): BlockConfig {
	const schema =
		definition.schema ?? fieldsToSchema(definition.fields, blockSchemaResolvers)
	return {
		slug: definition.slug,
		label: definition.label ?? labelFromSlug(definition.slug),
		interfaceName: definition.interfaceName,
		group: definition.group,
		disableBlockName: definition.disableBlockName,
		fields: definition.fields,
		schema: schema.extend({
			blockType: z.literal(definition.slug),
			// Payload's `blockName`, the optional per-instance label stored on
			// the block's own data, edited through `BlocksField`'s row header.
			// Present on every block's schema regardless of `disableBlockName`
			// (which only hides the input, see `./types.ts`), so older data
			// without one keeps validating.
			blockName: z.string().optional()
		}),
		defaultValue:
			definition.defaultValue ?? deriveDefaultValues(definition.fields),
		Fields: definition.Fields ?? deriveBlockFields(definition.fields),
		Render: definition.Render,
		Icon: definition.Icon
	}
}
