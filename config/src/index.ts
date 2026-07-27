// The public entry point of `@base/config` — this is what a consuming app
// (e.g. `www/src/hooks/config`) imports to author a collection/global/the
// root config: `defineCollection`/`defineGlobal`/`baseConfig` plus the
// declarative vocabulary (`FieldConfig`/`TabConfig`) they take as input.
// Everything else in this package (`admin/`, `collections/`, `fields/`'s
// schema/renderer internals) is implementation — reachable by its own
// subpath when something genuinely needs it directly (e.g. a route
// importing `Topbar` from `@base/config/admin/views/topbar`), but not part of
// this authoring surface.

export { baseConfig, defineCollection, defineGlobal } from './define'
export type {
	AdminSettings,
	BaseConfigProps,
	CollectionFieldsProps
} from './base.types'
export type { FieldConfig, PluginFieldConfig, TabConfig } from './fields/types'
export { definePlugin } from './plugins/define'
export type {
	BasePlugin,
	PendingPlugin,
	PluginContext,
	PluginFieldType
} from './plugins/types'
