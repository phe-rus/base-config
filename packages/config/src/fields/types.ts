import type { FC } from 'react'
import type { SelectOption } from '@baseconfig/ui/forms'
import type { GeneratedBlockSlug } from '../base.types'

// The declarative field-authoring vocabulary, `@baseconfig/core`'s own core.
// Each variant here maps 1:1 onto an existing rendered field
// (`@baseconfig/ui/forms`'s primitives, or one of `collections/fields`'s
// composites), this is a vocabulary for *describing* a collection's fields.
// `schema.ts`'s `fieldsToSchema`/`tabsToSchema` turn it into a zod schema;
// `renderer.tsx`'s `createFieldsRenderer`/`createFlatFieldsRenderer` turn it
// into the actual React tree.

type BaseFieldConfig = {
	/**
	 * Path within the collection's data, matching `form.AppField`'s `name`,
	 * e.g. `'hero.content'`. For a field nested inside an `array`'s own
	 * `fields`, this is relative to one array item (the renderer resolves it
	 * against that item's own path), not the full document path.
	 */
	name: string
	label?: string
	/**
	 * Admin-only presentation settings, Payload's own `admin` option
	 * (https://payloadcms.com/docs/fields/overview#admin). `description`
	 * renders helper text under the field's label; `position` moves the
	 * field into the sidebar column instead of the main content column;
	 * `readOnly` renders the field disabled, Payload's own name for this
	 * (https://payloadcms.com/docs/fields/overview#admin-options), an alias
	 * for the top-level `disabled` below (`renderer.tsx` checks both), not a
	 * replacement: `disabled` predates this and real consumers already rely
	 * on it (`users.ts`'s server-managed fields, `plugin-form-builder`'s
	 * submission fields), so it stays exactly as it was rather than forcing
	 * a rename across every existing collection config.
	 */
	admin?: {
		description?: string
		position?: 'sidebar' | 'default'
		readOnly?: boolean
		/**
		 * Removes this field from the rendered form entirely (Payload's own
		 * `admin.hidden`, https://payloadcms.com/docs/fields/overview#admin-options),
		 * while it keeps participating in schema/default-value derivation like
		 * any other field, unlike the dedicated `hidden` field *type*, which
		 * is for a value with no UI concept at all (a server-assigned id).
		 * This is for a real, editable-in-principle field an admin just
		 * shouldn't see on this particular collection, a static flag, not a
		 * conditional (`admin.condition`, Payload's per-value visibility
		 * toggle, isn't built here, see this file's own doc comment).
		 */
		hidden?: boolean
		/**
		 * Forwarded straight to the underlying native `<input>`'s
		 * `autocomplete` attribute (Payload's own `admin.autoComplete`),
		 * only meaningful for the `Input`-backed leaf types (`text`, `email`,
		 * `password`, `confirmPassword`, `slug`), a no-op everywhere else.
		 */
		autoComplete?: string
		/**
		 * Sets `dir="rtl"` on the underlying input/textarea (Payload's own
		 * `admin.rtl`), for a field whose *value* is right-to-left content
		 * regardless of the admin UI's own locale. Same `Input`/`Textarea`-only
		 * scope as `autoComplete` above.
		 */
		rtl?: boolean
	}
	placeholder?: string
	required?: boolean
	disabled?: boolean
	/** Only set when a field should have a value out of the box, otherwise it's simply undefined. See `deriveDefaultValues` in `schema.ts`. */
	defaultValue?: unknown
	/**
	 * Custom validation beyond schema type/bounds, Payload's own `validate`
	 * field option (https://payloadcms.com/docs/fields/overview#validation),
	 * scoped down to a single-value function: `(value) => true | string`, no
	 * `siblingData`/whole-document access, that's still a whole-schema
	 * `.refine()` on the collection's own schema, the same boundary
	 * `confirmPassword`'s own doc comment already documents (a field can
	 * never see a sibling field's value here). Return `true` when valid, or
	 * a string error message. Runs as a `superRefine` on top of the field's
	 * own base schema, skipped entirely when the field is optional and
	 * empty (zod's own `.optional()` short-circuits before it ever runs).
	 */
	validate?: (value: unknown) => true | string
}

export type TextFieldConfig = BaseFieldConfig & {
	type: 'text'
	minLength?: number
	maxLength?: number
}
export type TextareaFieldConfig = BaseFieldConfig & {
	type: 'textarea'
	minLength?: number
	maxLength?: number
}
export type RichTextFieldConfig = BaseFieldConfig & {
	type: 'richtext'
	/**
	 * A path segment appended *under* the owning document's own folder for
	 * images this field uploads (direct uploads, pastes, and the media
	 * browser's uploads all land there), e.g. a `posts` document with
	 * `prefix: 'content'` uploads to `/posts/<id>/content/<filename>`.
	 * Omit for the document's own root.
	 */
	prefix?: string
}
export type CheckboxFieldConfig = BaseFieldConfig & { type: 'checkbox' }
export type SwitchFieldConfig = BaseFieldConfig & { type: 'switch' }
export type DateFieldConfig = BaseFieldConfig & { type: 'date' }
export type KeywordsFieldConfig = BaseFieldConfig & {
	type: 'keywords'
	/**
	 * Which global or collection supplies this field's suggestion pool,
	 * defaults to the `keywords` global. A global target reads that
	 * global's array-row labels (`{label}` rows) and stays writable (new
	 * labels are registered into that global's pool); a collection target
	 * reads its documents' `title`/`slug` labels as read-only suggestions.
	 * Multiple targets means the union of pools.
	 */
	relationTo?: string | string[]
}

/** A single file/image field, see `Upload` in `@baseconfig/ui/forms`. */
export type UploadFieldConfig = BaseFieldConfig & {
	type: 'upload'
	accept?: string
	/**
	 * A path segment appended *under* the collection's own folder (every
	 * collection gets one, named after its `slug`, automatically, see
	 * `define.ts`'s `createFieldsRenderer` call), e.g. a `home` collection's
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

/** A `text` value validated as an email address (https://payloadcms.com/docs/fields/email), rendered with `@baseconfig/ui/forms`'s `Email` (a preset `Input`, mail icon, no separate value handling). */
export type EmailFieldConfig = BaseFieldConfig & { type: 'email' }

/** A real numeric value (https://payloadcms.com/docs/fields/number), not a string coerced from an `<input>` the way `text` is. `min`/`max`/`step` gate the native input; schema-level bounds beyond that aren't enforced yet. */
export type NumberFieldConfig = BaseFieldConfig & {
	type: 'number'
	min?: number
	max?: number
	step?: number
}

/** A plain string field, rendered with `@baseconfig/ui/forms`'s `Password` (a preset `Input`, `type='password'`, lock icon). Meant for a generic collection's own password-like value; the real, server-backed `users` collection (`auth: true`) never goes through this generic schema at all, see `db/collections.ts`. */
export type PasswordFieldConfig = BaseFieldConfig & { type: 'password' }

/** Pairs with a sibling `password` field for a "type it again" check. Matches `password`'s own schema shape for now (`z.string()`), since the match itself is a whole-document concern this schema deriver doesn't check, same boundary `@baseconfig/ui/forms`'s `ConfirmPassword` already documents on its own component. */
export type ConfirmPasswordFieldConfig = BaseFieldConfig & {
	type: 'confirmPassword'
}

/** No visible chrome at all, `@baseconfig/ui/forms`'s `Hidden` renders a bare `<input type="hidden">`. For a value set elsewhere (a server-assigned id, a value another field computes), not typed directly, so `label`/`description`/`placeholder` are meaningless here even though they're still technically valid to set on `BaseFieldConfig`. */
export type HiddenFieldConfig = BaseFieldConfig & { type: 'hidden' }

/** A real CodeMirror 6 editor saving a plain string (https://payloadcms.com/docs/fields/code). `language` sets the initial language mode; the admin UI still shows its own corner toggle. See a consumer `code` block's `Fields` (e.g. `www/src/config/blocks/Code/Fields.tsx`) for the pattern of a sibling field reacting to this one's live value. */
export type CodeFieldConfig = BaseFieldConfig & {
	type: 'code'
	language?: string
}

/** Commits parsed JSON (`unknown`), not a string (https://payloadcms.com/docs/fields/json). See `@baseconfig/ui/forms`'s `JSON` field for why this needs its own local text buffer separate from the committed value. */
export type JSONFieldConfig = BaseFieldConfig & { type: 'json' }

/** A plain string field styled for a slug-shaped value (link icon, `autoComplete='off'`), unrelated to a document's own top-level `slug` column that every collection already gets for free. Use this only for a slug-shaped value nested somewhere else, e.g. inside an `array` item. */
export type SlugFieldConfig = BaseFieldConfig & { type: 'slug' }

/** `{lat, lng}` geographic coordinates (https://payloadcms.com/docs/fields/point), two coupled numeric inputs that commit together as one value. See `PointValue`/`Point` in `@baseconfig/ui/forms`. */
export type PointFieldConfig = BaseFieldConfig & { type: 'point' }

/**
 * A repeatable group of sub-fields (hero links, footer columns, a relation
 * group's picked ids, …). The item shape is itself a nested field list, the
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
 * A content-block picker, see `BlocksField` and the `blockRegistry` in
 * `collections/blocks`. `blocks` restricts which registered blocks this
 * field offers, by slug reference (the consumer owns the block tree, so a
 * field never re-passes block configs, it just names which of its own
 * registered blocks it wants); omit it to allow every registered block.
 * Typed as `TBlockSlug[]`, which defaults to the generated `GeneratedBlockSlug`
 * union (`../base.types`), so the restriction list autocompletes against the
 * consumer's own registered slugs (and a plugin, seeing no augmentation,
 * gets a plain `string`), Payload's `blocks` field option minus the
 * re-passing of block definitions. The restriction is enforced in all three
 * places a `blocks` field means something: the zod schema (`getBlocksSchema(slugs)`
 * in `fields/schema.ts`'s `case 'blocks'`, an unregistered slug throws),
 * the admin "Pick block" menu (`BlocksField`), and the generated types
 * (a restricted field emits the narrowed union of its blocks' own named
 * interfaces instead of `ContentBlock[]`, see `db/content-types-schema.ts`).
 * `minRows`/`maxRows` bound the number of block instances, Payload's
 * `minRows`/`maxRows` (https://payloadcms.com/docs/fields/blocks#minrows-maxrows),
 * enforced schema-side (a `superRefine` wrapper on the lazy block array,
 * see `fields/schema.ts`'s `case 'blocks'`) and reflected in the
 * admin UI as a live count plus a disabled "Add block" button at `maxRows`.
 */
export type BlocksFieldConfig<TBlockSlug extends string = GeneratedBlockSlug> =
	BaseFieldConfig & {
		type: 'blocks'
		blocks?: TBlockSlug[]
		/**
		 * Block slugs to hide from the "Add block" menu for *this* field,
		 * forwarded to `BlocksField` (`collections/fields/BlocksField`), the
		 * renderer-only nesting cap (a `grid`-style block passes
		 * `exclude: ['grid']` on its own `items` field so a grid can't nest
		 * itself); unlike `blocks`, purely presentational, never enforced
		 * schema-side (a disallowed-but-existing instance stays valid).
		 */
		exclude?: string[]
		minRows?: number
		maxRows?: number
	}

/**
 * A reference to one or many other collections' documents, modeled after
 * Payload's relationship field
 * (https://payloadcms.com/docs/fields/relationship), trimmed to the options
 * this app can actually back today. Left out on purpose, all because the
 * underlying infrastructure doesn't exist here (yet, or possibly ever):
 * `filterOptions` (needs a real query layer, today's `RelationshipField`
 * only supports the caller passing `excludeId`), `maxDepth`/`localized`/
 * `saveToJWT`/`graphQL` (no population-depth system, no i18n, no field data
 * in the auth JWT, no GraphQL layer), `unique`/`index` (no D1 schema for
 * content yet), `hooks`/`access`/`admin`/`custom`/`typescriptSchema` (no
 * field-level hook or access-control system, collection-level `permissions`
 * is itself still inert, see the config discussion).
 *
 * Value shape follows Payload's
 * (https://payloadcms.com/docs/fields/relationship#value-shape): a
 * single-`relationTo` (non-`hasMany`) field stores the bare document id; an
 * array `relationTo` stores `{relationTo, value}` (polymorphic); `hasMany:
 * true` stores an array of whichever of those applies. The former
 * `{id, slug, title, collection}` snapshot is gone, labels are re-derived
 * at render time.
 *
 * `minRows`/`maxRows` bound the number of picks (only meaningful with
 * `hasMany`), enforced schema-side with a `superRefine` wrapper, same as
 * `blocks`.
 */
export type RelationshipFieldConfig<TCollectionSlug extends string = string> =
	BaseFieldConfig & {
		type: 'relationship'
		/** One or many collection slugs this field can point to. */
		relationTo: TCollectionSlug | TCollectionSlug[]
		/** Allow picking more than one document instead of only one. */
		hasMany?: boolean
		/** Only meaningful with `hasMany`, fewest/most documents allowed. */
		minRows?: number
		maxRows?: number
	}

/**
 * The SEO title/description/keywords/preview bundle, see `MetaFields`.
 * Fixed shape today, no per-field configuration yet (the mockup's
 * `additionalFields` idea is a later extension point, not designed yet).
 */
export type MetaFieldConfig = BaseFieldConfig & { type: 'meta' }

/**
 * A navigation menu, every item is a link by default (optionally
 * auto-populated from an existing document via a reference), and can be
 * flagged as a mega menu instead (grouped columns, or one flat list). See
 * `NavMenuField`. Deliberately its own field type rather than forced into
 * generic primitives, same reasoning as `meta` above: per-item
 * conditional rendering the declarative `array`/`select` primitives don't
 * support.
 */
export type MenuFieldConfig<TCollectionSlug extends string = string> =
	BaseFieldConfig & {
		type: 'menu'
		/** New items start flagged as a mega menu (grouped columns) instead of a plain link, e.g. the footer, which is always column groups. */
		startAsMegaMenu?: boolean
		/** Restrict each item's "Reference" link mode to one or more collections, omit to search every collection this app has registered. */
		relationTo?: TCollectionSlug | TCollectionSlug[]
	}

/**
 * A list of links, each its own label + button appearance + a
 * reference-or-custom-URL target + "open in new tab", no mega-menu
 * option. Dispatched to `LinksField`
 * (`collections/fields/Links/index.tsx`), see that component's own doc
 * comment for the full shape (`linksSchema`/`linkItemSchema`,
 * `collections/types.ts`) and why its own mode/target logic
 * (`LinkModeFields`) is shared with `NavMenuField`'s own per-item links,
 * and with blocks (`cta`/`banner`) that call `LinksField` directly
 * instead of going through this generic dispatch.
 */
export type LinksFieldConfig<TCollectionSlug extends string = string> =
	BaseFieldConfig & {
		type: 'links'
		/** Restrict each link's "Reference" mode to one or more collections, omit to search every collection this app has registered. */
		relationTo?: TCollectionSlug | TCollectionSlug[]
	}

/**
 * Payload's own Row (https://payloadcms.com/docs/fields/row), pure visual
 * arrangement, no data nesting at all: every field inside `fields` is still
 * a flat sibling of whatever contains this `row`, just laid out
 * horizontally. Deliberately doesn't extend `BaseFieldConfig`, there's no
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
 * Payload's own Collapsible (https://payloadcms.com/docs/fields/collapsible),
 * same "no data nesting" contract as `row`, just admin-UI chrome (a
 * collapsible section instead of a horizontal layout). `label` is this
 * section's own header text, not a field label.
 */
export type CollapsibleFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'collapsible'
	label?: string
	/** Starts collapsed instead of expanded, admin-UI-only, no data implication. */
	initCollapsed?: boolean
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own Group (https://payloadcms.com/docs/fields/group), `name`
 * is deliberately optional, matching Payload's real behavior exactly: give
 * it a `name` to nest every field inside `fields` under that real key in
 * the data (e.g. `name: 'seo'` + an inner field `name: 'title'` → real path
 * `seo.title`); omit `name` for a purely visual grouping (a bordered
 * section with its own label/description) where the inner fields stay flat
 * siblings of whatever contains this `group`, same as `row`/`collapsible`
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
 * One sub-tab of a `tabs`-type field, mirrors `TabConfig`'s own
 * `tab`/`label`/`fields` shape (this is the field-level equivalent, nested
 * inside a document instead of describing the document's own top-level
 * tab chrome). `id` is a stable identifier for this sub-tab's own UI
 * (matches `TabConfig['tab']`'s role), never part of the data path
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
 * Payload's own field-level Tabs (https://payloadcms.com/docs/fields/tabs),
 * a *second* tabs concept, distinct from this package's own top-level
 * `TabConfig`/`tab:` (a collection/global's own outermost tab chrome, see
 * `admin/views/render-view.tsx`'s `Tabs` usage in `renderer.tsx`'s
 * `createFieldsRenderer`). This one nests *inside* a document's own
 * fields, e.g. one tab within a `content` tab holding its own sub-tabs.
 * Scoped to a single level for this pass (a sub-tab's own `fields` can
 * still use `row`/`collapsible`/`group` freely, just not a second nested
 * `tabs`-as-field), not a hard technical limit, just not attempted yet.
 */
export type TabsFieldConfig<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
> = {
	type: 'tabs'
	tabs: TabsFieldSubTab<TCollectionSlug, TBlockSlug>[]
}

/**
 * Payload's own UI field (https://payloadcms.com/docs/fields/ui), a blank
 * slot for a custom admin-only component, contributing nothing to
 * schema/defaultValues at all (skipped entirely by both). Typed loosely
 * (`FC<any>`), matching `GlobalDefinition`'s own `component: FC<any>`
 * trade-off, a custom component here is never handed `form`/`id` the way
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
	| EmailFieldConfig
	| NumberFieldConfig
	| PasswordFieldConfig
	| ConfirmPasswordFieldConfig
	| HiddenFieldConfig
	| CodeFieldConfig
	| JSONFieldConfig
	| SlugFieldConfig
	| PointFieldConfig
	| ArrayFieldConfig<TCollectionSlug, TBlockSlug>
	| BlocksFieldConfig<TBlockSlug>
	| RelationshipFieldConfig<TCollectionSlug>
	| MetaFieldConfig
	| MenuFieldConfig<TCollectionSlug>
	| LinksFieldConfig<TCollectionSlug>
	| RowFieldConfig<TCollectionSlug, TBlockSlug>
	| CollapsibleFieldConfig<TCollectionSlug, TBlockSlug>
	| GroupFieldConfig<TCollectionSlug, TBlockSlug>
	| TabsFieldConfig<TCollectionSlug, TBlockSlug>
	| UIFieldConfig

/** `row`/`collapsible`/`group`/`tabs`/`ui`: the field types that either fan out into their own `fields`/`tabs` (never contributing a single schema/defaultValue path themselves) or contribute nothing at all (`ui`). Shared by `fields/schema.ts` (to resolve them away before building a schema) and `fields/renderer.tsx` (to dispatch them to their own layout chrome instead of the generic `form.AppField` wrapper) so the two lists can't drift apart. */
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
	 * `data`, e.g. a collection whose rows come from an external source
	 * with its own fixed flat shape (`auth: true`'s `users` collection maps
	 * real better-auth fields straight across, see `db/collections.ts`'s
	 * `toUserDocumentRow`) rather than a shape this config itself defines.
	 */
	flat?: boolean
}
