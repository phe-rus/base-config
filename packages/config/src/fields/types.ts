import type { FC } from 'react'
import type { SelectOption } from '@baseconfig/ui/forms'

// The declarative field-authoring vocabulary — `@baseconfig/core`'s own core.
// Each variant here maps 1:1 onto an existing rendered field
// (`@baseconfig/ui/forms`'s primitives, or one of `collections/fields`'s
// composites) — this is a vocabulary for *describing* a collection's fields.
// `schema.ts`'s `fieldsToSchema`/`tabsToSchema` turn it into a zod schema;
// `renderer.tsx`'s `createFieldsRenderer`/`createFlatFieldsRenderer` turn it
// into the actual React tree.

type BaseFieldConfig = {
	/**
	 * Path within the collection's data, matching `form.AppField`'s `name` —
	 * e.g. `'hero.content'`. For a field nested inside an `array`'s own
	 * `fields`, this is relative to one array item (the renderer resolves it
	 * against that item's own path), not the full document path.
	 */
	name: string
	label?: string
	description?: string
	placeholder?: string
	required?: boolean
	disabled?: boolean
	/** Only set when a field should have a value out of the box — otherwise it's simply undefined. See `deriveDefaultValues` in `schema.ts`. */
	defaultValue?: unknown
}

export type TextFieldConfig = BaseFieldConfig & { type: 'text' }
export type TextareaFieldConfig = BaseFieldConfig & { type: 'textarea' }
export type RichTextFieldConfig = BaseFieldConfig & { type: 'richtext' }
export type CheckboxFieldConfig = BaseFieldConfig & { type: 'checkbox' }
export type SwitchFieldConfig = BaseFieldConfig & { type: 'switch' }
export type DateFieldConfig = BaseFieldConfig & { type: 'date' }
export type KeywordsFieldConfig = BaseFieldConfig & { type: 'keywords' }

/** A single file/image field — see `Upload` in `@baseconfig/ui/forms`. */
export type UploadFieldConfig = BaseFieldConfig & {
	type: 'upload'
	accept?: string
	/**
	 * A path segment appended *under* the collection's own folder (every
	 * collection gets one, named after its `slug`, automatically — see
	 * `define.ts`'s `createFieldsRenderer` call) — e.g. a `home` collection's
	 * field with `prefix: 'avatar'` uploads to `/home/avatar/<filename>`
	 * instead of `/home/<filename>`. Omit for the collection's own root.
	 */
	prefix?: string
}

export type SelectFieldConfig = BaseFieldConfig & {
	type: 'select'
	options: SelectOption[]
}

export type RadioFieldConfig = BaseFieldConfig & {
	type: 'radio'
	options: SelectOption[]
}

/**
 * A repeatable group of sub-fields (hero links, footer columns, a relation
 * group's picked ids, …). The item shape is itself a nested field list — the
 * eventual renderer turns this into `ArrayField`'s render-prop `children`
 * automatically, the same way every hand-written `Fields` component does
 * today.
 */
export type ArrayFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = BaseFieldConfig & {
	type: 'array'
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * A content-block picker — see `BlocksField` and the `blockRegistry` in
 * `collections/blocks`. `blocks` restricts the "Add block" menu to a
 * subset of the registry; omit it to allow every registered block.
 */
export type BlocksFieldConfig<TBlockSlug extends string = string> =
	BaseFieldConfig & {
		type: 'blocks'
		blocks?: TBlockSlug[]
	}

/**
 * A reference to one or many other collections' documents — modeled after
 * Payload's relationship field
 * (https://payloadcms.com/docs/fields/relationship), trimmed to the options
 * this app can actually back today. Left out on purpose, all because the
 * underlying infrastructure doesn't exist here (yet, or possibly ever):
 * `filterOptions` (needs a real query layer — today's `RelationshipField`
 * only supports the caller passing `excludeId`), `maxDepth`/`localized`/
 * `saveToJWT`/`graphQL` (no population-depth system, no i18n, no field data
 * in the auth JWT, no GraphQL layer), `unique`/`index` (no D1 schema for
 * content yet), `hooks`/`access`/`admin`/`custom`/`typescriptSchema` (no
 * field-level hook or access-control system — collection-level `permissions`
 * is itself still inert, see the config discussion).
 *
 * `hasMany` describes intent ahead of the renderer: today's
 * `RelationshipField` component is single-select only — a `hasMany: true`
 * config isn't wired to anything yet.
 */
export type RelationshipFieldConfig<TCollectionSlug extends string = string> =
	BaseFieldConfig & {
		type: 'relationship'
		/** One or many collection slugs this field can point to. */
		relationTo: TCollectionSlug | TCollectionSlug[]
		/** Allow picking more than one document instead of only one. */
		hasMany?: boolean
		/** Only meaningful with `hasMany` — fewest/most documents allowed. */
		minRows?: number
		maxRows?: number
	}

/**
 * The "related posts" composite (label + manual/keyword mode + picker) — see
 * `RelationsField`/`RelationGroupFields`. Deliberately its own field type
 * rather than forced into generic primitives: it's a fixed, opinionated
 * shape today, not a general-purpose relations builder.
 */
export type RelationsFieldConfig<TCollectionSlug extends string = string> =
	BaseFieldConfig & {
		type: 'relations'
		relationTo?: TCollectionSlug
	}

/**
 * The SEO title/description/keywords/preview bundle — see `MetaFields`.
 * Fixed shape today, same as `relations` above; no per-field configuration
 * yet (the mockup's `additionalFields` idea is a later extension point, not
 * designed yet).
 */
export type MetaFieldConfig = BaseFieldConfig & { type: 'meta' }

/**
 * A navigation menu — every item is a link by default (optionally
 * auto-populated from an existing document via a reference), and can be
 * flagged as a mega menu instead (grouped columns, or one flat list). See
 * `NavMenuField`. Deliberately its own field type rather than forced into
 * generic primitives — same reasoning as `relations`/`meta` above: per-item
 * conditional rendering the declarative `array`/`select` primitives don't
 * support.
 */
export type MenuFieldConfig = BaseFieldConfig & {
	type: 'menu'
	/** New items start flagged as a mega menu (grouped columns) instead of a plain link — e.g. the footer, which is always column groups. */
	startAsMegaMenu?: boolean
}

/**
 * A list of links — each its own label + button appearance + a
 * reference-or-custom-URL target + "open in new tab", no mega-menu
 * option. Dispatched to `LinksField`
 * (`collections/fields/links-field.tsx`) — see that component's own doc
 * comment for the full shape (`linksSchema`/`linkItemSchema`,
 * `collections/types.ts`) and why its own mode/target logic
 * (`LinkModeFields`) is shared with `NavMenuField`'s own per-item links,
 * and with blocks (`cta`/`banner`) that call `LinksField` directly
 * instead of going through this generic dispatch.
 */
export type LinksFieldConfig = BaseFieldConfig & {
	type: 'links'
}

/**
 * Payload's own Row (https://payloadcms.com/docs/fields/row) — pure visual
 * arrangement, no data nesting at all: every field inside `fields` is still
 * a flat sibling of whatever contains this `row`, just laid out
 * horizontally. Deliberately doesn't extend `BaseFieldConfig` — there's no
 * `name` (nothing to key data under), no `defaultValue`/`required`
 * (nothing to validate directly); the fields inside carry their own.
 */
export type RowFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'row'
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own Collapsible (https://payloadcms.com/docs/fields/collapsible)
 * — same "no data nesting" contract as `row`, just admin-UI chrome (a
 * collapsible section instead of a horizontal layout). `label` is this
 * section's own header text, not a field label.
 */
export type CollapsibleFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'collapsible'
	label?: string
	/** Starts collapsed instead of expanded — admin-UI-only, no data implication. */
	initCollapsed?: boolean
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own Group (https://payloadcms.com/docs/fields/group) — `name`
 * is deliberately optional, matching Payload's real behavior exactly: give
 * it a `name` to nest every field inside `fields` under that real key in
 * the data (e.g. `name: 'seo'` + an inner field `name: 'title'` → real path
 * `seo.title`); omit `name` for a purely visual grouping (a bordered
 * section with its own label/description) where the inner fields stay flat
 * siblings of whatever contains this `group` — same as `row`/`collapsible`
 * in that case, just with a heading and border instead of a different
 * layout.
 */
export type GroupFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'group'
	name?: string
	label?: string
	description?: string
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * One sub-tab of a `tabs`-type field — mirrors `TabConfig`'s own
 * `tab`/`label`/`fields` shape (this is the field-level equivalent, nested
 * inside a document instead of describing the document's own top-level
 * tab chrome). `id` is a stable identifier for this sub-tab's own UI
 * (matches `TabConfig['tab']`'s role) — never part of the data path
 * itself, that's `name`'s job, same optional-nest-vs-flat rule
 * `GroupFieldConfig['name']` has.
 */
export type TabsFieldSubTab<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	id: string
	label: string
	name?: string
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own field-level Tabs (https://payloadcms.com/docs/fields/tabs)
 * — a *second* tabs concept, distinct from this package's own top-level
 * `TabConfig`/`tab:` (a collection/global's own outermost tab chrome, see
 * `admin/views/render-view.tsx`'s `Tabs` usage in `renderer.tsx`'s
 * `createFieldsRenderer`). This one nests *inside* a document's own
 * fields — e.g. one tab within a `content` tab holding its own sub-tabs.
 * Scoped to a single level for this pass (a sub-tab's own `fields` can
 * still use `row`/`collapsible`/`group` freely, just not a second nested
 * `tabs`-as-field) — not a hard technical limit, just not attempted yet.
 */
export type TabsFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'tabs'
	tabs: TabsFieldSubTab<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own UI field (https://payloadcms.com/docs/fields/ui) — a blank
 * slot for a custom admin-only component, contributing nothing to
 * schema/defaultValues at all (skipped entirely by both). Typed loosely
 * (`FC<any>`), matching `GlobalDefinition`'s own `component: FC<any>`
 * trade-off — a custom component here is never handed `form`/`id` the way
 * a real field's renderer is.
 */
export type UIFieldConfig = {
	type: 'ui'
	Component: FC<any>
}

export type FieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> =
	| TextFieldConfig
	| TextareaFieldConfig
	| RichTextFieldConfig
	| CheckboxFieldConfig
	| SwitchFieldConfig
	| DateFieldConfig
	| KeywordsFieldConfig
	| UploadFieldConfig
	| SelectFieldConfig
	| RadioFieldConfig
	| ArrayFieldConfig<TCollectionSlug, TBlockSlug>
	| BlocksFieldConfig<TBlockSlug>
	| RelationshipFieldConfig<TCollectionSlug>
	| RelationsFieldConfig<TCollectionSlug>
	| MetaFieldConfig
	| MenuFieldConfig
	| LinksFieldConfig
	| RowFieldConfig<TCollectionSlug, TBlockSlug>
	| CollapsibleFieldConfig<TCollectionSlug, TBlockSlug>
	| GroupFieldConfig<TCollectionSlug, TBlockSlug>
	| TabsFieldConfig<TCollectionSlug, TBlockSlug>
	| UIFieldConfig

/** `row`/`collapsible`/`group`/`tabs`/`ui` — the field types that either fan out into their own `fields`/`tabs` (never contributing a single schema/defaultValue path themselves) or contribute nothing at all (`ui`). Shared by `fields/schema.ts` (to resolve them away before building a schema) and `fields/renderer.tsx` (to dispatch them to their own layout chrome instead of the generic `form.AppField` wrapper) so the two lists can't drift apart. */
const CONTAINER_FIELD_TYPES = new Set([
	'row',
	'collapsible',
	'group',
	'tabs',
	'ui'
])

export function isContainerFieldType(type: string): boolean {
	return CONTAINER_FIELD_TYPES.has(type)
}

export type TabConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	tab: string
	label: string
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
	/**
	 * Skips `withTabPrefix`'s path-prefixing for every field in this tab, not
	 * just one whose `name` happens to equal the tab id. Needed whenever a
	 * tab groups several fields that must stay flat, top-level keys in
	 * `data` — e.g. a collection whose rows come from an external source
	 * with its own fixed flat shape (`auth: true`'s `users` collection maps
	 * real better-auth fields straight across, see `db/collections.ts`'s
	 * `toUserDocumentRow`) rather than a shape this config itself defines.
	 */
	flat?: boolean
}
