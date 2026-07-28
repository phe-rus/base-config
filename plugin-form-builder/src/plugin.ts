import type { BaseConfigProps, Plugin } from '../../base.types'
import { formSubmissionsCollection } from './form-submissions-collection'
import { formsCollection } from './forms-collection'

/**
 * Adds the `forms`/`form-submissions` collections to the config — the
 * isomorphic, admin-authoring half of the form builder. Modeled on
 * Payload's own `@payloadcms/plugin-form-builder`, which is itself "just a
 * plugin" built on Payload's own public collection API — same idea here:
 * this calls the normal `defineCollection()` factory, no special-cased
 * bypass.
 *
 * **Only half the picture** — the *public* half (accepting a real
 * submission, sending the configured emails) needs binding access
 * (`db`, `EMAIL`) this isomorphic config can never have (see
 * `CollectionHooks`'/`ContentEndpoint`'s own doc comments,
 * `base.types.ts`/`db/content-route.ts`, for why). That half is
 * `formBuilderEndpoints({db, sendEmail})` (`endpoints.ts`) — a consumer
 * adds *both*: this plugin in `base.config.ts`'s `plugins: [...]`, and
 * `formBuilderEndpoints(...)`'s result in `createHandler({endpoints: [...]})`
 * (`www/src/api/index.ts`). Two calls, not one — an honest, disclosed gap
 * from "install one plugin, done," forced by this repo's isomorphic-config/
 * server-only-handler split not existing in Payload's own (server-only)
 * config at all.
 */
export function formBuilderPlugin(): Plugin {
	return (config: BaseConfigProps): BaseConfigProps => ({
		...config,
		collections: [
			...config.collections,
			formsCollection,
			formSubmissionsCollection
		]
	})
}
