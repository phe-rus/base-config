import type { PendingPlugin, PluginDefinition } from './types'

/**
 * Returns a factory, not a plugin instance directly — matching Payload's
 * own advanced plugin API (`definePlugin<Options>({slug, order, plugin})`
 * returns a function you call with your options: `myPlugin({enabled: true})`
 * in the consumer's own `plugins: [...]` array). This is a real behavior
 * change from this package's earlier `definePlugin(plugin) => plugin`
 * identity function: plugins had no `order` and no way to see or react to
 * each other, so two plugins that needed to cooperate had no supported way
 * to do it short of one importing the other's internals directly. See
 * `PluginContext`'s own doc comment for exactly how the cross-plugin
 * mutation this enables actually works, and `registry.ts`'s
 * `registerPlugins` for how `order`/`plugins` get resolved.
 */
export function definePlugin<
	TOptions extends Record<string, unknown> = Record<string, never>
>(definition: PluginDefinition<TOptions>) {
	return (options: TOptions = {} as TOptions): PendingPlugin<TOptions> => ({
		slug: definition.slug,
		order: definition.order ?? 0,
		options,
		resolve: (plugins) => definition.plugin({ plugins, ...options })
	})
}
