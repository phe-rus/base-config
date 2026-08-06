import type { FC } from 'react'
import { hc } from 'hono/client'
import { z } from 'zod'
import type { BaseConfigRouteType } from './api/route'
import { getBlocksSchema, registerBlocks } from './collections/blocks'
import { BlocksField } from './collections/fields/BlocksField'
import { LinksField } from './collections/fields/Links'
import { MetaFields } from './collections/fields/MetaFields'
import { NavMenuField } from './collections/fields/NavMenu'
import { RelationshipField } from './collections/fields/Relationship'
import {
	registerBaseConfig,
	registerEndpointFactories
} from './collections/registry'
import { registerAdminConfig } from './admin/functions/config-registry'
import { labelFromSlug } from './collections/slug'
import {
	createContentApiClient,
	registerContentDataSource,
	registerUsersDataSource
} from './db/collections'
import {
	createStorageApiClient,
	registerStorageDataSource
} from './fields/storage-client'
import type { CollectionSlug, GlobalSlug } from './collections/types'
import { linksSchema, metaSchema, navMenuSchema } from './collections/types'
import type {
	BaseConfigProps,
	CollectionAccess,
	CollectionConfig as BaseCollectionConfig,
	CollectionHooks,
	GeneratedBlockSlug,
	GeneratedCollectionDoc,
	GeneratedGlobalDoc,
	GlobalAccess,
	GlobalConfig as BaseGlobalConfig
} from './base.types'
import type { FieldConfig, TabConfig } from './fields/types'
import {
	createFieldsRenderer,
	createFlatFieldsRenderer,
	type FieldRenderers
} from './fields/renderer'
import {
	deriveDefaultValues,
	fieldsToSchema,
	flattenTabFields,
	tabsToSchema,
	type FieldSchemaResolvers
} from './fields/schema'

// This app has exactly one real implementation of each composite field type,
// wired once here, so every collection/global under `hooks/config/collections`/
// `hooks/config/globals` only ever writes `{slug, label, tabs}`, never
// resolver boilerplate.
const schemaResolvers: FieldSchemaResolvers = {
	meta: metaSchema,
	// A function returning the `z.lazy`, not the lazy itself, see
	// `getBlocksSchema()`'s own doc comment (`collections/blocks/registry.ts`)
	// for why the *resolution* must be lazy: it needs to run after
	// `baseConfig()` has run (and registered every plugin's own blocks), but
	// `schemaResolvers` itself is built once, at this module's own eval time,
	// well before that. `case 'blocks'` calls it with the field's own
	// `blocks` restriction list (if any), so a restricted `blocks` field
	// validates against just that subset.
	blocks: (slugs) => z.lazy(() => getBlocksSchema(slugs)),
	menu: navMenuSchema,
	links: linksSchema
}

const fieldRenderers: FieldRenderers<CollectionSlug> = {
	meta: MetaFields,
	blocks: BlocksField,
	relationship: RelationshipField,
	menu: NavMenuField,
	links: LinksField
}

// Field types whose value renders sensibly as a flat table cell: everything
// else (upload/richtext/blocks/meta/menu/array) holds structured
// data a single cell can't meaningfully show, so `deriveDefaultColumns` below
// leaves those out of the auto-derived default.
const RENDERABLE_COLUMN_FIELD_TYPES = new Set([
	'text',
	'textarea',
	'checkbox',
	'switch',
	'date',
	'select',
	'radio',
	'keywords'
])

/**
 * The `columns` a collection gets when it doesn't specify its own: every
 * field simple enough to show as a flat cell, on top of the title/slug
 * every collection already has. When `useAsTitle` is set (see
 * `CollectionConfig['admin']`), the synthetic title/slug columns are
 * skipped, the real field they'd otherwise duplicate already appears
 * naturally in `fieldColumns` below.
 */
function deriveDefaultColumns(
	tabs: TabConfig<any, any>[],
	useAsTitle?: string
): { key: string; label: string; type?: string }[] {
	const fieldColumns = flattenTabFields(tabs)
		.filter((field) => RENDERABLE_COLUMN_FIELD_TYPES.has(field.type))
		.map((field) => ({
			key: field.name,
			label:
				'label' in field && field.label
					? field.label
					: labelFromSlug(field.name),
			type: field.type
		}))
	if (useAsTitle) return fieldColumns
	return [
		{ key: 'title', label: 'Title' },
		{ key: 'slug', label: 'Slug' },
		...fieldColumns
	]
}

/** The five base columns every document has regardless of its own fields (`db/collections.ts`'s `withBaseFields`), a `defaultColumns` entry naming one of these has no real field to look a label up from. */
const BASE_COLUMN_LABELS: Record<string, string> = {
	title: 'Title',
	slug: 'Slug',
	status: 'Status',
	updatedAt: 'Updated',
	createdAt: 'Created'
}

/**
 * Turns a consumer's own `admin.defaultColumns: string[]` (`CollectionDefinition`'s
 * own doc comment on why it's bare field names, not `{key, label}` objects)
 * into the richer `{key, label, type?}[]` shape `CollectionConfig['admin']['defaultColumns']`/
 * `CollectionTable` actually consume: each name is looked up against this
 * collection's own real field list (`flattenTabFields(tabs)`), reusing that
 * field's own already-declared `label` (or `labelFromSlug(name)`) and `type`
 * (for `checkbox`/`switch` cell rendering), a name matching no real field
 * falls back to `BASE_COLUMN_LABELS` (the base id/status/updated/created
 * columns every document already has), and finally to `labelFromSlug(name)`
 * itself if it matches neither, rather than silently dropping an unknown key.
 */
function resolveDefaultColumns(
	tabs: TabConfig<any, any>[],
	keys: string[]
): { key: string; label: string; type?: string }[] {
	const fieldsByName = new Map(
		flattenTabFields(tabs).map((field) => [field.name, field])
	)
	return keys.map((key) => {
		const field = fieldsByName.get(key)
		if (field) {
			return {
				key,
				label:
					'label' in field && field.label ? field.label : labelFromSlug(key),
				type: field.type
			}
		}
		return { key, label: BASE_COLUMN_LABELS[key] ?? labelFromSlug(key) }
	})
}

type CollectionDefinition<TSlug extends string> = {
	slug: TSlug
	/** Derived from `slug` via `labelFromSlug()` if omitted (e.g. `'blog-posts'` -> `'Blog Posts'`), `slug` is the one required identity, `label` is just its display form. */
	label?: string
	/** A literal Tailwind class for the collection's type dot, see `CollectionConfig['color']`. */
	color?: string
	/** The public URL prefix for this collection's documents, see `CollectionConfig['path']`. Omit for root-level documents. */
	path?: string
	/** Marks this as the real, server-backed users collection, see `CollectionConfig['auth']`. */
	auth?: boolean
	/**
	 * Admin-display overrides, see `CollectionConfig['admin']`'s own doc
	 * comment for the full field-name-autocomplete story (`defaultColumns`/
	 * `filterKey`/`groupBy` all key off this collection's own generated
	 * document shape once `defineCollection<TSlug>`'s slug is passed
	 * explicitly). `defaultColumns` omitted auto-derives every simple
	 * (flat-cell-renderable) field via `deriveDefaultColumns`.
	 *
	 * **`defaultColumns` is a bare array of field names here**, Payload's
	 * own exact `admin.defaultColumns: string[]` shape
	 * (https://payloadcms.com/docs/configuration/collections#admin-options):
	 * `['title', 'category', 'slug']`, not `[{key, label}, ...]`. A column's
	 * label is resolved from that field's own already-declared `label` (or
	 * `labelFromSlug(name)` if it didn't set one), never re-typed a second
	 * time here, `defineCollection` looks each name up against this same
	 * `tabs` list below to build the richer `{key, label, type?}` shape
	 * `CollectionConfig['admin']['defaultColumns']` (and `CollectionTable`)
	 * actually consume, see `resolveDefaultColumns()`.
	 */
	admin?: {
		useAsTitle?: string
		defaultColumns?: (
			| (keyof GeneratedCollectionDoc<TSlug> & string)
			| 'title'
			| 'slug'
			| 'status'
			| 'updatedAt'
			| 'createdAt'
		)[]
		filterKey?:
			| (keyof GeneratedCollectionDoc<TSlug> & string)
			| 'title'
			| 'slug'
		groupBy?:
			| (keyof GeneratedCollectionDoc<TSlug> & string)
			| 'title'
			| 'slug'
			| 'status'
			| 'updatedAt'
	}
	/**
	 * `TBlockSlug` is the generated `GeneratedBlockSlug` union, not a plain
	 * `string`, so a `blocks` field's own `blocks: [...]` restriction list
	 * autocompletes against the consumer's registered slugs (falls back to
	 * `string` in a plugin package or an un-generated consumer).
	 */
	tabs: TabConfig<string, GeneratedBlockSlug>[]
	/**
	 * Pure, isomorphic-safe lifecycle hooks, see `CollectionHooks`' own doc
	 * comment (`base.types.ts`). Typed against this collection's own real
	 * generated document shape (`GeneratedCollectionDoc<TSlug>`, once a
	 * consumer's generated `src/config/base.types.ts` has augmented
	 * `GeneratedCollectionTypes`), not a bare `Record<string, unknown>`, so
	 * e.g. `beforeChange`'s `data.authorId` is checked against the real
	 * field, not `any`.
	 */
	hooks?: CollectionHooks<GeneratedCollectionDoc<TSlug>>
	/** Pure, isomorphic-safe per-operation access control, see `CollectionAccess`'s own doc comment (`base.types.ts`). Omit for open (every operation allowed to everyone). */
	access?: CollectionAccess
}

/**
 * Builds a real `CollectionConfig` from just `{slug, tabs}`, `label` (see
 * `CollectionDefinition['label']`), schema, default values, and the
 * `Fields` renderer are all derived automatically.
 *
 * **Generic over `TSlug`, defaulting to this app's own `CollectionSlug`**:
 * `www/src/config/collections/*.ts` calling this with no explicit type
 * argument gets exactly today's behavior (TS infers `TSlug` from the
 * literal `slug` it passes, narrower than but still assignable to
 * `CollectionSlug`); a plugin package (which has no way to reference this
 * app's own closed union) calls the exact same function with its own slug
 * and gets a `CollectionConfig` typed to just that slug back, no special
 * bypass, the same "library builds it, consumer only calls it" factory
 * either way.
 */
export function defineCollection<TSlug extends string = CollectionSlug>(
	definition: CollectionDefinition<TSlug>
): BaseCollectionConfig<TSlug> {
	return {
		slug: definition.slug,
		label: definition.label ?? labelFromSlug(definition.slug),
		tabs: definition.tabs,
		path: definition.path,
		auth: definition.auth,
		admin: {
			useAsTitle: definition.admin?.useAsTitle,
			defaultColumns: definition.admin?.defaultColumns
				? resolveDefaultColumns(
						definition.tabs,
						definition.admin.defaultColumns
					)
				: deriveDefaultColumns(definition.tabs, definition.admin?.useAsTitle),
			filterKey: definition.admin?.filterKey,
			groupBy: definition.admin?.groupBy
		},
		color: definition.color,
		hooks: definition.hooks,
		access: definition.access,
		schema: tabsToSchema(definition.tabs, schemaResolvers),
		defaultValues: () => deriveDefaultValues(flattenTabFields(definition.tabs)),
		Fields: createFieldsRenderer(
			definition.tabs,
			fieldRenderers as FieldRenderers<string>,
			definition.slug
		)
	}
}

type GlobalDefinition<TSlug extends string> =
	| {
			slug: TSlug
			/** Derived from `slug` via `labelFromSlug()` if omitted, see `CollectionDefinition['label']`. */
			label?: string
			/** `GeneratedBlockSlug` here for the same reason `CollectionDefinition['tabs']` carries it: a `blocks` field's restriction list autocompletes. */
			fields: FieldConfig<string, GeneratedBlockSlug>[]
			component?: never
			/** Same generic typing as `CollectionDefinition['hooks']`, against `GeneratedGlobalDoc<TSlug>` instead. */
			hooks?: CollectionHooks<GeneratedGlobalDoc<TSlug>>
			/** Pure, isomorphic-safe per-operation access control, see `GlobalAccess`'s own doc comment (`base.types.ts`). Omit for open. */
			access?: GlobalAccess
	  }
	| {
			slug: TSlug
			label?: string
			/**
			 * Renders as the whole page directly, no `GlobalForm` wrapper, no
			 * document/schema/save at all (see `GlobalConfig['custom']`). For a
			 * global that isn't really a document to edit, e.g. Storage. Typed
			 * loosely (`any` props) since a custom global is never handed
			 * `form`/`id` in practice, same trade-off `CollectionFieldsProps.form`
			 * already makes.
			 */
			component: FC<any>
			fields?: never
			hooks?: never
			/** Not meaningful here: a `custom: true` global has no `content-route.ts` endpoint at all (same reason `hooks` is forbidden above it), nothing to gate. */
			access?: never
	  }

/**
 * Builds a real `GlobalConfig`: `{slug, fields}` derives
 * `schema`/`defaultValues`/`Fields` same as `defineCollection`, minus tabs
 * (globals render their fields directly, no `Tabs` chrome); `{slug,
 * component}` skips all of that for a fully custom-rendered global
 * instead. Generic over `TSlug` for the same reason `defineCollection` is,
 * see that function's own doc comment.
 */
export function defineGlobal<TSlug extends string = GlobalSlug>(
	definition: GlobalDefinition<TSlug>
): BaseGlobalConfig<TSlug> {
	if (definition.component) {
		return {
			slug: definition.slug,
			label: definition.label ?? labelFromSlug(definition.slug),
			schema: z.object({}),
			defaultValues: () => ({}),
			Fields: definition.component,
			custom: true
		}
	}
	return {
		slug: definition.slug,
		label: definition.label ?? labelFromSlug(definition.slug),
		fields: definition.fields,
		hooks: definition.hooks,
		access: definition.access,
		schema: fieldsToSchema(definition.fields, schemaResolvers),
		defaultValues: () => deriveDefaultValues(definition.fields),
		Fields: createFlatFieldsRenderer(
			definition.fields,
			fieldRenderers as FieldRenderers<string>,
			definition.slug
		)
	}
}

/**
 * The root-level counterpart to `defineCollection`/`defineGlobal`: matches
 * Payload's own `export default buildConfig({...})` convention. Registers
 * the given collections/globals with the registry and returns the same
 * config, so `hooks/config/base.config.ts` collapses to one
 * `export default baseConfig({...})` statement instead of a separate
 * `registerBaseConfig(...)` call after the fact. Same reasoning for
 * `auth`, see `BaseConfigProps['auth']`.
 *
 * **Builds this package's own `/api/*` RPC client internally**, a
 * consumer used to hand-build a typed `hc<TypeRouter>()` client
 * (`www/src/lib/route.ts`) against their *own* app's route type and pass
 * the result in as `contentClient`/`storageClient`; now that every route
 * this client ever calls is 100% library-owned (`createHandler()`/
 * `createBaseConfigRoute()`, no consumer-specific routes mixed in), this
 * package can type that client against its own `BaseConfigRouteType`
 * directly, needing only an origin. In an actual browser,
 * `window.location.origin` is always correct (same-origin, no custom-domain/
 * dev-port drift); `config.hostDomain` is the SSR-only fallback, read
 * exclusively when there's no `window` to ask (see its own doc comment,
 * `base.types.ts`).
 *
 * **Runs `config.plugins` first**, each one folding its own return value
 * into the next, see `Plugin`'s own doc comment (`base.types.ts`). A
 * plugin's own `collections`/`globals` (e.g. a form-builder plugin's
 * `forms`/`form-submissions`) are registered exactly like hand-written
 * ones below, since by the time `registerBaseConfig` runs, `config` already
 * includes them.
 */
export function baseConfig(config: BaseConfigProps): BaseConfigProps {
	config = (config.plugins ?? []).reduce(
		(current, plugin) => plugin(current),
		config
	)

	registerBaseConfig(config.collections, config.globals)
	registerBlocks(config.blocks ?? [])
	registerEndpointFactories(config.endpointFactories ?? [])
	registerAdminConfig(config.config)

	const apiOrigin =
		typeof window !== 'undefined' ? window.location.origin : config.hostDomain
	const client = hc<BaseConfigRouteType>(`${apiOrigin}/api`, {
		init: { credentials: 'include' }
	})

	registerContentDataSource({
		queryClient: config.queryClient,
		client: createContentApiClient(client)
	})
	registerStorageDataSource(createStorageApiClient(client.storage))

	if (config.auth) {
		registerUsersDataSource({
			queryClient: config.queryClient,
			authClient: config.auth
		})
	}
	return config
}
