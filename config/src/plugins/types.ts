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
	 * (`@pherus/utilities/forms`) itself to read/write this field's value —
	 * the same mechanism the built-in `Upload` primitive already uses. Only
	 * ever receives the field's own config; `form`/`name` reach it via
	 * `useFieldState()`'s field context, not as props.
	 */
	render: FC<{ field: PluginFieldConfig }>
}

/**
 * A plugin contributes config the engine already knows how to consume —
 * mirroring Payload's own plugin model (a plugin hands back field/config
 * objects, it never patches the framework itself). `admin` and `fieldTypes`
 * are two of the three extension surfaces; the third — API routes — is
 * deliberately **not** a field on this type. `BasePlugin` (and the whole
 * `plugins: BasePlugin[]` array passed to `baseConfig()`) flows through
 * isomorphic code — `admin/dashboard/component.tsx` reads `admin` slots,
 * `fields/renderer.tsx` reads `fieldTypes`, both client-side — so a plugin
 * object itself must never carry anything that touches server-only
 * bindings (`env`, D1, R2, …), the same reason route code never lives in a
 * route file's loader/top-level.
 *
 * A plugin that needs its own API routes exports them as a *separate*
 * named export from the same module — a plain Hono app (or a factory
 * function, if it needs a binding passed in, matching
 * `createContentRoute(db)`/`createStorageRoute(bucket)`'s own shape) — and
 * a consumer imports that export directly into their own server-only
 * `api.ts`, mounting it with `.route('/my-plugin', ...)` exactly like any
 * other library-owned route. It's never registered through
 * `baseConfig()`/`registerPlugins()`, and the plugin's main
 * `definePlugin({...})` object never references it. See
 * `www/src/config/plugins/example-api-plugin.ts` for a minimal, fully
 * wired demonstration of this shape end to end.
 */
export type BasePlugin = {
	/** Unique, human-readable — shown nowhere yet, but every registry entry needs one for future debugging/ordering. */
	name: string
	admin?: {
		/** Rendered above the dashboard's own content (`ContextView.Dashboard`) — e.g. an announcement banner. */
		beforeDashboard?: FC[]
		/** Rendered below the dashboard's own content. */
		afterDashboard?: FC[]
	}
	/** New field types this plugin contributes — see `PluginFieldType`, `PluginFieldConfig`. */
	fieldTypes?: PluginFieldType[]
}
