import type { FC } from 'react'
import type { z } from 'zod'
import type { PluginFieldConfig } from '../fields/types'

/**
 * One plugin-contributed field type — resolved at runtime by a field's own
 * `pluginType` (see `PluginFieldConfig`). `schema`/`render` mirror the shape
 * every built-in field type already has (`fields/schema.ts`'s
 * `baseFieldSchema` switch, `fields/renderer.tsx`'s `renderField` switch) —
 * a plugin field type is not a lesser citizen, it gets the same two hooks.
 */
export type PluginFieldType = {
	/** Matches a field's own `pluginType` — must be unique across every registered plugin's contributed field types (last registration wins on a collision, same as `collectionsBySlug`). */
	type: string
	/** Returns this field's value schema — same contract as the built-in `FieldSchemaResolvers` map values in `fields/schema.ts`. */
	schema: (field: PluginFieldConfig) => z.ZodTypeAny
	/**
	 * Rendered inside a `form.AppField`, so it can call `useFieldState()`
	 * (`@base/ui/forms`) itself to read/write this field's value —
	 * the same mechanism the built-in `Upload` primitive already uses. Only
	 * ever receives the field's own config; `form`/`name` reach it via
	 * `useFieldState()`'s field context, not as props.
	 */
	render: FC<{ field: PluginFieldConfig }>
}

/**
 * What a plugin's `plugin()` function actually hands back — the two
 * surfaces `registerPlugins()` folds into the flat `pluginAdminSlots`/
 * `pluginFieldTypes` registries. API routes are deliberately **not** a
 * field here — see `BasePlugin`'s own doc comment for why (this whole
 * shape flows through isomorphic code; routes are server-only).
 */
export type BasePluginContribution = {
	admin?: {
		/** Rendered above the dashboard's own content (`ContextView.Dashboard`) — e.g. an announcement banner. */
		beforeDashboard?: FC[]
		/** Rendered below the dashboard's own content. */
		afterDashboard?: FC[]
	}
	/** New field types this plugin contributes — see `PluginFieldType`, `PluginFieldConfig`. */
	fieldTypes?: PluginFieldType[]
}

/**
 * A fully registered plugin instance — what lives in the `plugins` map
 * `registerPlugins()` builds and threads through every plugin's own
 * `plugin()` function (see `PluginContext`). `options` starts as whatever
 * the consumer passed when calling the plugin's factory (`myPlugin({...})`)
 * and is mutable right up until this plugin's own `plugin()` function
 * actually runs — see `definePlugin`'s doc comment for the cross-plugin
 * communication this enables. `admin`/`fieldTypes` start `undefined` and
 * get filled in once this plugin's own `plugin()` function resolves.
 */
export type BasePlugin = BasePluginContribution & {
	slug: string
	/** Lower runs first; ties keep their original `plugins: [...]` array position (stable sort). Default `0`. */
	order: number
	options: Record<string, unknown>
}

/**
 * What a plugin's own `plugin()` function receives — the consumer's own
 * options for *this* plugin, spread directly in, plus `plugins`: every
 * registered plugin (including this one), keyed by `slug`. An
 * earlier-`order` plugin can reach into a later one's `plugins[slug].options`
 * and mutate it — since `plugins` is the same object every plugin's
 * `plugin()` function receives, and lower-order plugins run first, that
 * mutation is visible by the time the later plugin's own `plugin()`
 * function actually reads its `options`. Mirrors Payload's own advanced
 * plugin API (`{config, plugins, ...options}`) minus `config` — this
 * package has no single "whole config" object threading through plugins,
 * only the two flat contribution surfaces `BasePluginContribution` covers.
 */
export type PluginContext<TOptions extends Record<string, unknown>> = {
	plugins: Record<string, BasePlugin>
} & TOptions

export type PluginDefinition<TOptions extends Record<string, unknown>> = {
	/** Unique across every registered plugin — the key `plugins[slug]` resolves by. */
	slug: string
	/** Lower runs first. Default `0`. */
	order?: number
	plugin: (ctx: PluginContext<TOptions>) => BasePluginContribution
}

/**
 * A plugin instance before its own `plugin()` function has run — what
 * `definePlugin(...)`'s returned factory actually produces, and what
 * `plugins: PendingPlugin[]` (`BaseConfigProps`) is really an array of.
 * `slug`/`order`/`options` are known immediately (at the point a consumer
 * calls `myPlugin({...})` in their own `base.config.ts`); `resolve()` is
 * what `registerPlugins()` calls, once, in `order`, to get the actual
 * `admin`/`fieldTypes` contribution.
 */
export type PendingPlugin<
	TOptions extends Record<string, unknown> = Record<string, unknown>
> = {
	slug: string
	order: number
	options: TOptions
	resolve: (plugins: Record<string, BasePlugin>) => BasePluginContribution
}
