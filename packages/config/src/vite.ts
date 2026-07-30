import type { HmrContext, Plugin } from 'vite'

/**
 * Reachable at `@baseconfig/core/vite`, separate from the main isomorphic
 * barrel (`index.ts`) since it's a Vite-config-only, dev-tooling concern, not
 * something a consumer's own app code (browser or server) ever imports.
 * `vite` itself is a peer dependency (types only, this file never imports
 * anything from `vite` at runtime) rather than a real dependency, matching
 * how every other Vite plugin package expects the consumer's own installed
 * Vite to be the one actually resolved.
 */
export type AutoMigratePluginOptions = {
	/**
	 * Absolute path to the directory whose changes should trigger
	 * `regenerate()`, typically a consumer's own CMS config directory
	 * (`base.config.ts` plus its collections/globals), resolved by the
	 * consumer's own `vite.config.ts` (e.g. `path.resolve(__dirname, './src/config')`).
	 * This package never guesses a convention here, since a consumer's own
	 * directory layout is exactly the kind of thing this library otherwise
	 * has no way to know (same reasoning as `hostDomain`/`bindings` elsewhere).
	 */
	watchDir: string
	/**
	 * Runs the consumer's own regenerate-then-migrate chain (whatever that
	 * looks like for them, e.g. spawning `bun run local --skip-auth`) and
	 * resolves `true` on success, `false` on failure. This package never
	 * assumes a package manager, a script name, or a tool (`drizzle-kit`,
	 * `wrangler`, etc.), that's entirely the consumer's own already-tested
	 * command, this plugin only decides *when* to call it and what to do
	 * with the result.
	 */
	regenerate: () => Promise<boolean>
	/** Debounce window between the last detected change and actually calling `regenerate()`. Defaults to 300ms. */
	debounceMs?: number
}

/**
 * Dev-only convenience: whenever a file under `watchDir` changes, debounce,
 * then call the consumer's own `regenerate()` and force a full reload once
 * it resolves `true`. Solves "I have to remember to re-run migrate every
 * time I touch a collection field" without bypassing any official tooling
 * itself, this plugin only decides when to trigger the consumer's own
 * already-official chain, never reimplements it.
 *
 * `apply: 'serve'` keeps this out of `vite build` entirely: there's no
 * long-running dev server to watch anything during a one-shot build.
 */
export function baseConfigAuto({
	watchDir,
	regenerate,
	debounceMs = 300
}: AutoMigratePluginOptions): Plugin {
	let pending = false
	let debounceTimer: ReturnType<typeof setTimeout> | undefined

	return {
		name: 'baseconfig-auto-migrate',
		apply: 'serve',
		handleHotUpdate(ctx: HmrContext) {
			if (!ctx.file.startsWith(watchDir)) return
			if (debounceTimer) clearTimeout(debounceTimer)

			debounceTimer = setTimeout(async () => {
				if (pending) return
				pending = true
				console.log(
					'\n[baseconfig] config changed, regenerating schema + migrating local D1...'
				)
				const ok = await regenerate()
				pending = false
				if (ok) {
					console.log('[baseconfig] done, reloading...')
					ctx.server.ws.send({ type: 'full-reload' })
				} else {
					console.error(
						'[baseconfig] generate/migrate failed, see output above; fix and save again to retry'
					)
				}
			}, debounceMs)

			// We're handling this file's update ourselves (a full reload once
			// regenerate() finishes), tell Vite not to also HMR it normally.
			return []
		}
	}
}
