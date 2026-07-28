import type { SelectOption } from '@base/ui/forms'

// The declarative field-authoring vocabulary — `@base/config`'s own core.
// Each variant here maps 1:1 onto an existing rendered field
// (`@base/ui/forms`'s primitives, or one of `collections/fields`'s
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

/** A single file/image field — see `Upload` in `@base/ui/forms`. */
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
