import type { FC } from 'react'
import { hc } from 'hono/client'
import { z } from 'zod'
import type { BaseConfigRouteType } from './api/route'
import { getBlocksSchema, registerBlocks } from './collections/blocks'
import { BlocksField } from './collections/fields/blocks-field'
import { LinksField } from './collections/fields/links-field'
import { MetaFields } from './collections/fields/meta-fields'
import { NavMenuField } from './collections/fields/nav-menu-field'
import { RelationsField } from './collections/fields/relations-field'
import { RelationshipField } from './collections/fields/relationship-field'
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
import {
	linksSchema,
	metaSchema,
	navMenuSchema,
	relationsSchema
} from './collections/types'
import type {
	BaseConfigProps,
	CollectionConfig as BaseCollectionConfig,
	CollectionHooks,
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
	tabsToSchema
} from './fields/schema'

// This app has exactly one real implementation of each composite field type —
// wired once here, so every collection/global under `hooks/config/collections`/
// `hooks/config/globals` only ever writes `{slug, label, tabs}`, never
// resolver boilerplate.
const schemaResolvers = {
	meta: metaSchema,
	relations: relationsSchema,
	// Lazy, not the plain schema object `meta`/`relations`/`menu` are — see
	// `getBlocksSchema()`'s own doc comment (`collections/blocks/index.ts`)
	// for why: this needs to resolve *after* `baseConfig()` has run (and
	// registered every plugin's own blocks), but `schemaResolvers` itself is
	// built once, at this module's own eval time, well before that.
	blocks: z.lazy(() => getBlocksSchema()),
	menu: navMenuSchema,
	links: linksSchema
}

const fieldRenderers: FieldRenderers<CollectionSlug> = {
	meta: MetaFields,
	relations: RelationsField,
	blocks: BlocksField,
	relationship: RelationshipField,
	menu: NavMenuField,
	links: LinksField
}

// Field types whose value renders sensibly as a flat table cell — everything
// else (upload/richtext/blocks/relations/meta/menu/array) holds structured
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
 * The `columns` a collection gets when it doesn't specify its own — every
 * field simple enough to show as a flat cell, on top of the title/slug
 * every collection already has. When `useAsTitle` is set (see
 * `CollectionConfig['admin']`), the synthetic title/slug columns are
 * skipped — the real field they'd otherwise duplicate already appears
 * naturally in `fieldColumns` below.
 */
function deriveDefaultColumns(
	tabs: TabConfig<string, string>[],
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

type CollectionDefinition<TSlug extends string> = {
	slug: TSlug
	/** Derived from `slug` via `labelFromSlug()` if omitted (e.g. `'blog-posts'` -> `'Blog Posts'`) — `slug` is the one required identity, `label` is just its display form. */
	label?: string
	/** A literal Tailwind class for the collection's type dot — see `CollectionConfig['color']`. */
	color?: string
	/** The public URL prefix for this collection's documents — see `CollectionConfig['path']`. Omit for root-level documents. */
	path?: string
	/** Marks this as the real, server-backed users collection — see `CollectionConfig['auth']`. */
	auth?: boolean
	/** Which own fields `CollectionTable` shows as columns — see `CollectionConfig['columns']`. Omit to auto-derive every simple (flat-cell-renderable) field via `deriveDefaultColumns`. */
	columns?: { key: string; label: string; type?: string }[]
	/** Which column the table searches on — see `CollectionConfig['filterKey']`. Defaults to the first derived/given column. */
	filterKey?: string
	/** Admin-display overrides — see `CollectionConfig['admin']`. */
	admin?: { useAsTitle?: string }
	tabs: TabConfig<string, string>[]
	/** Pure, isomorphic-safe lifecycle hooks — see `CollectionHooks`' own doc comment (`base.types.ts`). */
	hooks?: CollectionHooks
}

/**
 * Builds a real `CollectionConfig` from just `{slug, tabs}` — `label` (see
 * `CollectionDefinition['label']`), schema, default values, and the
 * `Fields` renderer are all derived automatically.
 *
 * **Generic over `TSlug`, defaulting to this app's own `CollectionSlug`** —
 * `www/src/config/collections/*.ts` calling this with no explicit type
 * argument gets exactly today's behavior (TS infers `TSlug` from the
 * literal `slug` it passes, narrower than but still assignable to
 * `CollectionSlug`); a plugin package (which has no way to reference this
 * app's own closed union) calls the exact same function with its own slug
 * and gets a `CollectionConfig` typed to just that slug back — no special
 * bypass, the same "library builds it, consumer only calls it" factory
 * either way.
 */
export function defineCollection<TSlug extends string = CollectionSlug>(
	definition: CollectionDefinition<TSlug>
): BaseCollectionConfig<TSlug> {
	return {
		slug: definition.slug,
		label: definition.label ?? labelFromSlug(definition.slug),
		path: definition.path,
		auth: definition.auth,
		admin: definition.admin,
		columns:
			definition.columns ??
			deriveDefaultColumns(definition.tabs, definition.admin?.useAsTitle),
		filterKey: definition.filterKey,
		color: definition.color,
		hooks: definition.hooks,
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
			/** Derived from `slug` via `labelFromSlug()` if omitted — see `CollectionDefinition['label']`. */
			label?: string
			fields: FieldConfig<string, string>[]
			component?: never
			hooks?: CollectionHooks
	  }
	| {
			slug: TSlug
			label?: string
			/**
			 * Renders as the whole page directly — no `GlobalForm` wrapper, no
			 * document/schema/save at all (see `GlobalConfig['custom']`). For a
			 * global that isn't really a document to edit — e.g. Storage. Typed
			 * loosely (`any` props) since a custom global is never handed
			 * `form`/`id` in practice — same trade-off `CollectionFieldsProps.form`
			 * already makes.
			 */
			component: FC<any>
			fields?: never
			hooks?: never
	  }

/**
 * Builds a real `GlobalConfig` — `{slug, fields}` derives
 * `schema`/`defaultValues`/`Fields` same as `defineCollection`, minus tabs
 * (globals render their fields directly, no `Tabs` chrome); `{slug,
 * component}` skips all of that for a fully custom-rendered global
 * instead. Generic over `TSlug` for the same reason `defineCollection` is
 * — see that function's own doc comment.
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
		hooks: definition.hooks,
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
 * The root-level counterpart to `defineCollection`/`defineGlobal` — matches
 * Payload's own `export default buildConfig({...})` convention. Registers
 * the given collections/globals with the registry and returns the same
 * config, so `hooks/config/base.config.ts` collapses to one
 * `export default baseConfig({...})` statement instead of a separate
 * `registerBaseConfig(...)` call after the fact. Same reasoning for
 * `auth` — see `BaseConfigProps['auth']`.
 *
 * **Builds this package's own `/api/*` RPC client internally** — a
 * consumer used to hand-build a typed `hc<TypeRouter>()` client
 * (`www/src/lib/route.ts`) against their *own* app's route type and pass
 * the result in as `contentClient`/`storageClient`; now that every route
 * this client ever calls is 100% library-owned (`createHandler()`/
 * `createBaseConfigRoute()` — no consumer-specific routes mixed in), this
 * package can type that client against its own `BaseConfigRouteType`
 * directly, needing only an origin. In an actual browser,
 * `window.location.origin` is always correct (same-origin, no custom-domain/
 * dev-port drift); `config.hostDomain` is the SSR-only fallback, read
 * exclusively when there's no `window` to ask (see its own doc comment,
 * `base.types.ts`).
 *
 * **Runs `config.plugins` first**, each one folding its own return value
 * into the next — see `Plugin`'s own doc comment (`base.types.ts`). A
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
