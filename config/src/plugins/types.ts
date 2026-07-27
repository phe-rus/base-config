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
 * are the extension surfaces built so far; API routes are still planned —
 * see the project roadmap — deliberately not stubbed in yet so this type
 * never carries a surface nothing reads.
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
