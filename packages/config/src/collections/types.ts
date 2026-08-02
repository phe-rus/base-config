import type {
	CollectionConfig as BaseCollectionConfig,
	GlobalConfig as BaseGlobalConfig
} from '../base.types'
import { uploadValueSchema } from '../fields/schema'
import { z } from 'zod'

export type { CollectionFieldsProps } from '../base.types'

// Deliberately plain `string`, not a hardcoded union of this library's own
// built-in example slugs: this file is imported by every consumer, and a
// closed union here would mean no consumer could ever register a collection
// slug this library's own authors didn't happen to type out. `defineCollection`/
// `defineGlobal` (`define.ts`) are already generic over `TSlug extends string`
// specifically so a consumer's own literal slug (e.g. `'products'`) still gets
// real type-level tracking, this default is only what a *plain, unannotated*
// `CollectionConfig`/`GlobalConfig` reference resolves to.
export type CollectionSlug = string
export type GlobalSlug = string

export const metaSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	/** The SEO/OG share image, a single image, not a gallery. */
	image: uploadValueSchema.optional(),
	keywords: z.array(z.string()).optional()
})

/** Plain TS shape of `metaSchema`, the `type: 'meta'` field's real value. */
export type MetaValue = z.infer<typeof metaSchema>

/** One selected relationship, see `RelationshipValue` in `fields/Relationship/index.tsx`, the actual source of this shape. */
export const relationshipValueSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	/** Which collection the referenced document belongs to, lets a display resolve the right `path` prefix via `collectionPath()` without a live lookup. */
	collection: z.string()
})

// One relations field shape shared by every collection, a list of groups,
// each either a hand-picked set of posts or a keyword filter that resolves
// to whichever posts currently share one of those keywords. `label` lets
// posts (which can have several groups) name each one as a category.
export const relationsSchema = z.array(
	z.object({
		label: z.string().optional(),
		mode: z.enum(['manual', 'keyword']).optional(),
		ids: z.array(relationshipValueSchema).optional(),
		keywords: z.array(z.string()).optional()
	})
)

/** Plain TS shape of `relationsSchema`, the `type: 'relations'` field's real value. */
export type RelationsValue = z.infer<typeof relationsSchema>

/** shadcn's own `Button` variants (`shared/ui/src/components/button.tsx`), reused so a nav item/link can be styled like a real button. */
export const appearanceValues = [
	'default',
	'secondary',
	'destructive',
	'outline',
	'ghost',
	'link'
] as const

/**
 * A single link's own mode/target: a reference to an existing
 * page/post/policy (`mode: 'internal'`, `to` synced from `reference.slug`
 * at selection time, see `RelationshipField`'s `onValueChange`) or a
 * hand-typed URL (`mode: 'custom'`). Not a strict `discriminatedUnion`,
 * matching how `relationsSchema` above handles its own manual/keyword
 * mode. The base both `navMenuLinkSchema` (below) and `linkItemSchema`
 * (further below, the real value behind `type: 'links'`,
 * `fields/types.ts`'s `LinksFieldConfig`, rendered by `LinksField`,
 * `fields/Links/index.tsx`) extend with their own `label`/`appearance`.
 */
export const linkValueSchema = z.object({
	mode: z.enum(['internal', 'custom']).optional(),
	/** Used when `mode === 'internal'`. */
	reference: relationshipValueSchema.optional(),
	/** The actual path/URL, hand-typed when `mode === 'custom'`, auto-synced from `reference.slug` when `mode === 'internal'`. */
	to: z.string().optional(),
	openInNewTab: z.boolean().optional()
})

/** Plain TS shape of `linkValueSchema`, for a block's own `Render` (e.g. `blocks/Cta/index.tsx`/`blocks/Banner/index.tsx`) reading a document's raw stored `data`, which isn't run through the schema itself. */
export type LinkValue = z.infer<typeof linkValueSchema>

export const navMenuLinkSchema = linkValueSchema.extend({
	label: z.string().optional()
})

/**
 * One item in a `type: 'links'` field (`LinksField`, `fields/Links/index.tsx`),
 * a link (`linkValueSchema`) plus its own `label` and button `appearance`,
 * so a block like `cta`/`banner` can hold several differently-styled
 * buttons instead of one block-level button. Same `label` field
 * `navMenuLinkSchema` already has, plus `appearance` (nav *items*, not nav
 * *links*, are the ones that already had this, `navMenuItemSchema` below,
 * this is that same field, just on a plain link instead of a full nav
 * item with its own mega-menu option).
 */
export const linkItemSchema = linkValueSchema.extend({
	label: z.string().optional(),
	appearance: z.enum(appearanceValues).optional()
})

/** Plain TS shape of `linkItemSchema`, for a block's own `Render` reading raw stored `data`. */
export type LinkItemValue = z.infer<typeof linkItemSchema>

/** The shape a `type: 'links'` field's value actually is: bare array, same convention `navMenuSchema` below already uses for `type: 'menu'`. */
export const linksSchema = z.array(linkItemSchema)

const navMenuColumnSchema = z.object({
	title: z.string().optional(),
	links: z.array(navMenuLinkSchema).optional()
})

// A nav item is a link by default (same mode/reference/to/openInNewTab shape
// as `navMenuLinkSchema`, plus its own button `appearance`) that can be
// flagged as a mega menu instead (`isMegaMenu: true`), at that point the
// link fields no longer apply, and it holds either grouped columns
// (`category: true`, the default, several columns, each its own title) or
// one flat list with no per-group title (`category: false`).
export const navMenuItemSchema = z.object({
	label: z.string().optional(),
	appearance: z.enum(appearanceValues).optional(),
	mode: z.enum(['internal', 'custom']).optional(),
	reference: relationshipValueSchema.optional(),
	to: z.string().optional(),
	openInNewTab: z.boolean().optional(),
	isMegaMenu: z.boolean().optional(),
	category: z.boolean().optional(),
	/** Used when `isMegaMenu && category !== false`. */
	columns: z.array(navMenuColumnSchema).optional(),
	/** Used when `isMegaMenu && category === false`. */
	links: z.array(navMenuLinkSchema).optional()
})

/** Plain TS shape of `navMenuItemSchema`, one item of a `type: 'menu'` field's real value. */
export type NavMenuItemValue = z.infer<typeof navMenuItemSchema>

/** The shape a `type: 'menu'` field's value actually is, see `NavMenuField` (`fields/NavMenu/index.tsx`). Bare array (not wrapped in `{items: [...]}`), same as `blocksSchema`, the field itself resolves directly to this value. */
export const navMenuSchema = z.array(navMenuItemSchema)

/** Plain TS shape of `navMenuSchema`, the `type: 'menu'` field's real value. */
export type NavMenuValue = z.infer<typeof navMenuSchema>

// This app's own binding of the generic `../base.types.ts` shapes to its
// concrete slug unions above.
export type CollectionConfig = BaseCollectionConfig<CollectionSlug>
export type GlobalConfig = BaseGlobalConfig<GlobalSlug>

/**
 * The one place a collection's `path` option (see `CollectionConfig['path']`
 * in `../base.types.ts`) turns into an actual URL: `undefined`/`''` means
 * root-level (`/${slug}`), anything else becomes `/${path}/${slug}`. Strips
 * any stray leading/trailing slashes defensively, since `path` is meant to
 * be a bare segment.
 */
export function collectionPath(
	config: Pick<CollectionConfig, 'path'>,
	slug: string
): string {
	const prefix = config.path?.replace(/^\/+|\/+$/g, '')
	return prefix ? `/${prefix}/${slug}` : `/${slug}`
}

/**
 * The inverse of `collectionPath()`, given a public request's path
 * segments (already split on `/`, no empty/leading/trailing segments) and
 * every registered collection, resolves which collection/document a public
 * URL should render, or `null` if nothing matches. A root-level collection
 * (no `path`, e.g. `pages`) claims exactly one segment (`/<slug>`); a
 * collection with `path: 'post'` claims exactly two (`/post/<slug>`).
 * `auth: true` collections (`users`) are never publicly resolvable,
 * real accounts have no public document to render. Used by
 * `www/src/routes/(web)/$.tsx`'s loader.
 */
export function resolvePublicPath(
	collections: Record<string, CollectionConfig>,
	segments: string[]
): { collection: CollectionConfig; slug: string } | null {
	if (segments.length === 0 || segments.length > 2) return null
	for (const collection of Object.values(collections)) {
		if (collection.auth) continue
		const prefix = collection.path?.replace(/^\/+|\/+$/g, '')
		if (prefix) {
			if (segments.length === 2 && segments[0] === prefix) {
				return { collection, slug: segments[1] }
			}
		} else if (segments.length === 1) {
			return { collection, slug: segments[0] }
		}
	}
	return null
}
