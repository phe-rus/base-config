import type { FC } from 'react'
import { z } from 'zod'
import { blocksSchema } from './collections/blocks'
import type { BlockSlug } from './collections/blocks'
import { BlocksField } from './collections/fields/blocks-field'
import { MetaFields } from './collections/fields/meta-fields'
import { NavMenuField } from './collections/fields/nav-menu-field'
import { RelationsField } from './collections/fields/relations-field'
import { RelationshipField } from './collections/fields/relationship-field'
import { registerBaseConfig } from './collections/registry'
import { labelFromSlug } from './collections/slug'
import {
	registerContentDataSource,
	registerUsersDataSource
} from './db/collections'
import { registerStorageDataSource } from './fields/storage-client'
import type {
	CollectionConfig,
	CollectionSlug,
	GlobalConfig,
	GlobalSlug
} from './collections/types'
import { metaSchema, navMenuSchema, relationsSchema } from './collections/types'
import type { BaseConfigProps } from './base.types'
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
	blocks: blocksSchema,
	menu: navMenuSchema
}

const fieldRenderers: FieldRenderers<CollectionSlug> = {
	meta: MetaFields,
	relations: RelationsField,
	blocks: BlocksField,
	relationship: RelationshipField,
	menu: NavMenuField
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
	tabs: TabConfig<CollectionSlug, BlockSlug>[],
	useAsTitle?: string
): { key: string; label: string }[] {
	const fieldColumns = flattenTabFields(tabs)
		.filter((field) => RENDERABLE_COLUMN_FIELD_TYPES.has(field.type))
		.map((field) => ({
			key: field.name,
			label:
				'label' in field && field.label
					? field.label
					: labelFromSlug(field.name)
		}))
	if (useAsTitle) return fieldColumns
	return [
		{ key: 'title', label: 'Title' },
		{ key: 'slug', label: 'Slug' },
		...fieldColumns
	]
}

type CollectionDefinition = {
	slug: CollectionSlug
	/** Derived from `slug` via `labelFromSlug()` if omitted (e.g. `'blog-posts'` -> `'Blog Posts'`) — `slug` is the one required identity, `label` is just its display form. */
	label?: string
	/** A literal Tailwind class for the collection's type dot — see `CollectionConfig['color']`. */
	color?: string
	/** The public URL prefix for this collection's documents — see `CollectionConfig['path']`. Omit for root-level documents. */
	path?: string
	/** Marks this as the real, server-backed users collection — see `CollectionConfig['auth']`. */
	auth?: boolean
	/** Which own fields `CollectionTable` shows as columns — see `CollectionConfig['columns']`. Omit to auto-derive every simple (flat-cell-renderable) field via `deriveDefaultColumns`. */
	columns?: { key: string; label: string }[]
	/** Which column the table searches on — see `CollectionConfig['filterKey']`. Defaults to the first derived/given column. */
	filterKey?: string
	/** Admin-display overrides — see `CollectionConfig['admin']`. */
	admin?: { useAsTitle?: string }
	tabs: TabConfig<CollectionSlug, BlockSlug>[]
}

/** Builds a real `CollectionConfig` from just `{slug, tabs}` — `label` (see `CollectionDefinition['label']`), schema, default values, and the `Fields` renderer are all derived automatically. */
export function defineCollection(
	definition: CollectionDefinition
): CollectionConfig {
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
		schema: tabsToSchema(definition.tabs, schemaResolvers),
		defaultValues: () => deriveDefaultValues(flattenTabFields(definition.tabs)),
		Fields: createFieldsRenderer(
			definition.tabs,
			fieldRenderers,
			definition.slug
		)
	}
}

type GlobalDefinition =
	| {
			slug: GlobalSlug
			/** Derived from `slug` via `labelFromSlug()` if omitted — see `CollectionDefinition['label']`. */
			label?: string
			fields: FieldConfig<CollectionSlug, BlockSlug>[]
			component?: never
	  }
	| {
			slug: GlobalSlug
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
	  }

/** Builds a real `GlobalConfig` — `{slug, fields}` derives `schema`/`defaultValues`/`Fields` same as `defineCollection`, minus tabs (globals render their fields directly, no `Tabs` chrome); `{slug, component}` skips all of that for a fully custom-rendered global instead. */
export function defineGlobal(definition: GlobalDefinition): GlobalConfig {
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
		schema: fieldsToSchema(definition.fields, schemaResolvers),
		defaultValues: () => deriveDefaultValues(definition.fields),
		Fields: createFlatFieldsRenderer(
			definition.fields,
			fieldRenderers,
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
 */
export function baseConfig(config: BaseConfigProps): BaseConfigProps {
	registerBaseConfig(config.collections, config.globals)
	registerContentDataSource({
		queryClient: config.queryClient,
		client: config.contentClient
	})
	registerStorageDataSource(config.storageClient)
	if (config.auth) {
		registerUsersDataSource({
			queryClient: config.queryClient,
			authClient: config.auth
		})
	}
	return config
}
