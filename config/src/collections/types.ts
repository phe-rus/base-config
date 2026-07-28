import type {
	CollectionConfig as BaseCollectionConfig,
	GlobalConfig as BaseGlobalConfig
} from '../base.types'
import { uploadValueSchema } from '../fields/schema'
import { z } from 'zod'

export type { CollectionFieldsProps } from '../base.types'

// `forms`/`form-submissions` are the plugins/form-builder's own two
// collections (`base/config/src/plugins/form-builder/`) — a real, disclosed
// limitation of this union living here at all: it's meant to model "this
// app's own slugs," but a plugin has no way to extend a closed union from
// outside this file, so its slugs get folded in directly instead. A
// consumer that never installs `formBuilderPlugin()` still gets these two
// extra members in the type (harmless — they just never appear in the
// live registry), which is the honest trade-off until this union is made
// genuinely open/generic per consumer, a bigger change than this plugin's
// own scope.
export type CollectionSlug =
	| 'pages'
	| 'posts'
	| 'policies'
	| 'users'
	| 'forms'
	| 'form-submissions'
export type GlobalSlug = 'topbar' | 'footer' | 'keywords' | 'storage'

export const metaSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	/** The SEO/OG share image — a single image, not a gallery. */
	image: uploadValueSchema.optional(),
	keywords: z.array(z.string()).optional()
})

/** One selected relationship — see `RelationshipValue` in `fields/relationship-field.tsx`, the actual source of this shape. */
export const relationshipValueSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	/** Which collection the referenced document belongs to — lets a display resolve the right `path` prefix via `collectionPath()` without a live lookup. */
	collection: z.string()
})

// One relations field shape shared by every collection — a list of groups,
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

/** shadcn's own `Button` variants (`shared/ui/src/components/button.tsx`) — reused so a nav item/link can be styled like a real button. */
export const appearanceValues = [
	'default',
	'secondary',
	'destructive',
	'outline',
	'ghost',
	'link'
] as const

// A nav link is either a reference to an existing page/post/policy
// (`mode: 'internal'`, `to` synced from `reference.slug` at selection time —
// see `RelationshipField`'s `onValueChange`) or a hand-typed URL
// (`mode: 'custom'`). Same shape either way, not a strict
// `discriminatedUnion`, matching how `relationsSchema` above handles its own
// manual/keyword mode.
export const navMenuLinkSchema = z.object({
	label: z.string().optional(),
	mode: z.enum(['internal', 'custom']).optional(),
	/** Used when `mode === 'internal'`. */
	reference: relationshipValueSchema.optional(),
	/** The actual path/URL — hand-typed when `mode === 'custom'`, auto-synced from `reference.slug` when `mode === 'internal'`. */
	to: z.string().optional(),
	openInNewTab: z.boolean().optional()
})

const navMenuColumnSchema = z.object({
	title: z.string().optional(),
	links: z.array(navMenuLinkSchema).optional()
})

// A nav item is a link by default (same mode/reference/to/openInNewTab shape
// as `navMenuLinkSchema`, plus its own button `appearance`) that can be
// flagged as a mega menu instead (`isMegaMenu: true`) — at that point the
// link fields no longer apply, and it holds either grouped columns
// (`category: true`, the default — several columns, each its own title) or
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

/** The shape a `type: 'menu'` field's value actually is — see `NavMenuField` (`fields/nav-menu-field.tsx`). Bare array (not wrapped in `{items: [...]}`), same as `blocksSchema` — the field itself resolves directly to this value. */
export const navMenuSchema = z.array(navMenuItemSchema)

// This app's own binding of the generic `../base.types.ts` shapes to its
// concrete slug unions above.
export type CollectionConfig = BaseCollectionConfig<CollectionSlug>
export type GlobalConfig = BaseGlobalConfig<GlobalSlug>

/**
 * The one place a collection's `path` option (see `CollectionConfig['path']`
 * in `../base.types.ts`) turns into an actual URL — `undefined`/`''` means
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
