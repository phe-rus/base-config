import type { FC } from 'react'
import type { BasePlugin, PluginFieldType } from './types'

/**
 * *Passive* stores, same pattern (and same circular-import reasoning) as
 * `collections/registry.ts` — start empty, `registerPlugins()` populates
 * them, nothing in this package ever imports the consumer's own config to
 * reach them. `baseConfig()` is the one caller.
 */
export const pluginAdminSlots: { beforeDashboard: FC[]; afterDashboard: FC[] } =
	{
		beforeDashboard: [],
		afterDashboard: []
	}

/** Keyed by `PluginFieldType['type']` — `fields/schema.ts`/`fields/renderer.tsx` read this directly to resolve a `PluginFieldConfig`'s `pluginType`. */
export const pluginFieldTypes: Record<string, PluginFieldType> = {}

/**
 * Re-registering must *replace*, not accumulate — `baseConfig()` can run
 * more than once per process (Vite HMR re-evaluating `base.config.ts` on
 * every edit to it or anything it imports is the common case; a from-
 * scratch module reload isn't). `pluginFieldTypes` is naturally idempotent
 * (keyed by type, re-assignment just overwrites), but the admin slot arrays
 * aren't — `.push()`-ing onto them with no reset duplicated every plugin's
 * `beforeDashboard`/`afterDashboard` components once per HMR reload.
 */
export function registerPlugins(plugins: BasePlugin[]) {
	pluginAdminSlots.beforeDashboard.length = 0
	pluginAdminSlots.afterDashboard.length = 0

	for (const plugin of plugins) {
		if (plugin.admin?.beforeDashboard) {
			pluginAdminSlots.beforeDashboard.push(...plugin.admin.beforeDashboard)
		}
		if (plugin.admin?.afterDashboard) {
			pluginAdminSlots.afterDashboard.push(...plugin.admin.afterDashboard)
		}
		if (plugin.fieldTypes) {
			for (const fieldType of plugin.fieldTypes) {
				pluginFieldTypes[fieldType.type] = fieldType
			}
		}
	}
}
