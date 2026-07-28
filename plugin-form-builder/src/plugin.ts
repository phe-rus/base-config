import type { BaseConfigProps, Plugin } from '@base/config'
import { formBlock } from './form-block'
import { formBuilderEndpoints } from './endpoints'
import { formSubmissionsCollection } from './form-submissions-collection'
import { formsCollection } from './forms-collection'

/** One outgoing email, right before it's actually sent — see `beforeEmail`'s own doc comment below. */
export type FormBuilderEmail = {
	to: string
	from: string
	subject: string
	html: string
}

export type FormBuilderPluginOptions = {
	/**
	 * Matches Payload's own `beforeEmail` hook shape exactly: called with
	 * every interpolated email about to be sent for one submission, returns
	 * the (possibly transformed) list — e.g. to wrap `html` in a shared
	 * template. Must stay pure/isomorphic-safe like any other Tier-1 hook
	 * (see `CollectionHooks`' own doc comment, `@base/config`'s
	 * `base.types.ts`) — it only ever transforms data that's already been
	 * computed, it doesn't send anything itself.
	 */
	beforeEmail?: (
		emails: FormBuilderEmail[],
		ctx: { doc: Record<string, unknown> }
	) => FormBuilderEmail[]
	/**
	 * **An extension point only, not implemented in this pass.** Payload's
	 * own form-builder pairs this with a real `payment` field type
	 * (`basePrice`/`priceConditions`) and a price-calculation utility — this
	 * package has neither yet (a real payment integration is a materially
	 * bigger, separate feature — real money, real compliance surface). The
	 * option exists so a consumer can already configure it, matching
	 * Payload's real API surface, without this package pretending it's
	 * wired up: `formBuilderEndpoints()` never calls this today.
	 */
	handlePayment?: (ctx: {
		form: Record<string, unknown>
		submissionData: Record<string, unknown>
	}) => Promise<void>
}

let registeredOptions: FormBuilderPluginOptions = {}

/** Read by `endpoints.ts` at request time — see this file's own doc comment for why plugin *options* (as opposed to bindings like `db`/`sendEmail`) can round-trip through a plain module-level registration here instead of needing a second manual wiring step. */
export function getFormBuilderOptions(): FormBuilderPluginOptions {
	return registeredOptions
}

/**
 * Adds the `forms`/`form-submissions` collections, the `form` block, *and*
 * the public submission endpoint to the config — genuinely the **one and
 * only place** a consumer configures this plugin, matching Payload's own
 * `plugins: [formBuilderPlugin({...})]` call shape exactly. Modeled on
 * Payload's own `@payloadcms/plugin-form-builder`, itself "just a plugin"
 * built on Payload's own public collection API — same idea here: this
 * calls the normal `defineCollection()`/block-registry factories, no
 * special-cased bypass.
 *
 * **How the public half (`formBuilderEndpoints`, needs `db`/`sendEmail` —
 * real bindings this isomorphic config can never have, see
 * `EndpointFactory`'s own doc comment, `@base/config`'s `db/content-route.ts`)
 * still ends up wired without a second call**: rather than building real
 * endpoints here, this pushes the *function* `formBuilderEndpoints` itself
 * into `config.endpointFactories` — a plain function reference is
 * isomorphic-safe to merely *exist* in the config (it only touches a
 * binding once actually *called*, and it's only ever called from
 * `createHandler()`, server-only). `createHandler()` invokes every
 * registered factory with whatever bindings the consumer's own server
 * entry gave *it* generically (`db`, `sendEmail`, …) — so
 * `www/src/api/index.ts` never imports anything from this package at all.
 *
 * `options` (`beforeEmail`/`handlePayment`) round-trip the same way
 * `hooks` do elsewhere in this system: registered as a side effect
 * (`getFormBuilderOptions()`), read back by `formBuilderEndpoints` once
 * it's actually invoked.
 */
export function formBuilderPlugin(
	options: FormBuilderPluginOptions = {}
): Plugin {
	registeredOptions = options
	return (config: BaseConfigProps): BaseConfigProps => ({
		...config,
		collections: [
			...config.collections,
			formsCollection,
			formSubmissionsCollection
		],
		blocks: [...(config.blocks ?? []), formBlock],
		endpointFactories: [
			...(config.endpointFactories ?? []),
			formBuilderEndpoints
		]
	})
}
