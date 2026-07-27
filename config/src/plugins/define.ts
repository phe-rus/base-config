import type { BasePlugin } from './types'

/** Identity function, same trade-off as `defineCollection`/`defineGlobal` — no behavior of its own, just gives plugin authors a typed, discoverable entry point instead of hand-writing a `BasePlugin` object literal. */
export function definePlugin(plugin: BasePlugin): BasePlugin {
	return plugin
}
