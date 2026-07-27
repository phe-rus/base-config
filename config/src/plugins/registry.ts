import type { FC } from 'react'
import type { BasePlugin, PendingPlugin, PluginFieldType } from './types'

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
 * Every registered plugin, keyed by `slug` — the same object every
 * plugin's own `plugin()` function receives as `plugins` (see
 * `PluginContext`). Exposed here too (not just threaded through
 * resolution) so something outside a plugin's own `plugin()` function —
 * e.g. a future admin debug view — can inspect what's registered.
 */
export const registeredPlugins: Record<string, BasePlugin> = {}

/**
 * Resolves every plugin in `order` (lower first, ties keep their
 * `plugins: [...]` array position — `Array.prototype.sort` has been a
 * stable sort since ES2019), building `registeredPlugins` up one entry at
 * a time as each plugin's `resolve()` runs. This is what makes cross-plugin
 * communication actually work: `registeredPlugins[slug]` exists (with its
 * `options`, at least) for *every* plugin from the very start, before any
 * `resolve()` call — an earlier (lower-`order`) plugin's own `resolve()`
 * can reach into a later plugin's `registeredPlugins[laterSlug].options`
 * and mutate it, and since that mutation happens before the later plugin's
 * own `resolve()` runs, the later plugin sees the mutated value.
 *
 * Re-registering must *replace*, not accumulate — `baseConfig()` can run
 * more than once per process (Vite HMR re-evaluating `base.config.ts` on
 * every edit to it or anything it imports is the common case). Resetting
 * `registeredPlugins`/`pluginAdminSlots`/`pluginFieldTypes` first avoids
 * duplicating every plugin's contribution once per reload.
 */
export function registerPlugins(pendingPlugins: PendingPlugin[]) {
	pluginAdminSlots.beforeDashboard.length = 0
	pluginAdminSlots.afterDashboard.length = 0
	for (const slug of Object.keys(pluginFieldTypes))
		delete pluginFieldTypes[slug]
	for (const slug of Object.keys(registeredPlugins)) {
		delete registeredPlugins[slug]
	}

	for (const pending of pendingPlugins) {
		registeredPlugins[pending.slug] = {
			slug: pending.slug,
			order: pending.order,
			options: pending.options
		}
	}

	const ordered = [...pendingPlugins].sort((a, b) => a.order - b.order)
	for (const pending of ordered) {
		const contribution = pending.resolve(registeredPlugins)
		Object.assign(registeredPlugins[pending.slug], contribution)

		if (contribution.admin?.beforeDashboard) {
			pluginAdminSlots.beforeDashboard.push(
				...contribution.admin.beforeDashboard
			)
		}
		if (contribution.admin?.afterDashboard) {
			pluginAdminSlots.afterDashboard.push(...contribution.admin.afterDashboard)
		}
		if (contribution.fieldTypes) {
			for (const fieldType of contribution.fieldTypes) {
				pluginFieldTypes[fieldType.type] = fieldType
			}
		}
	}
}
