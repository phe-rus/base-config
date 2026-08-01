import type { BaseConfigProps, Plugin } from '@baseconfig/core'
import { formBlock } from './form-block'
import { formBuilderEndpoints } from './endpoints'
import { formSubmissionsCollection } from './form-submissions-collection'
import { formsCollection } from './forms-collection'

/** One outgoing email, right before it's actually handled: see `beforeEmail`'s own doc comment below. */
export type FormBuilderEmail = {
	to: string
	from: string
	subject: string
	html: string
}

/**
 * This plugin's own email contract, configured directly on
 * `formBuilderPlugin({handleEmail})`, the same single call that configures
 * `beforeEmail`/`handlePayment`, so this plugin's entire footprint stays in
 * one place in `base.config.ts` (no second, separate `createHandler()`
 * param needed). Merely *holding* this function reference in the plugin's
 * own isomorphic options registry is safe even though `base.config.ts` is
 * evaluated in the browser too: the risk is only ever in the function's
 * *body* (does it import/reference a secret or a server-only binding?),
 * never in the bare existence of a function value in the bundle; it's only
 * ever actually *called* from `formBuilderEndpoints`, server-only. This
 * package ships **no built-in implementation** of its own: not
 * Cloudflare's own `env.EMAIL` binding, not Resend, nothing, every real
 * option here has its own cost/plan model, this plugin doesn't pick one
 * for you. A `console.log` placeholder (like the one this repo currently
 * uses) has no secret in it at all, so it's completely fine to write
 * directly here; the day a real, secret-bearing provider is wired up, that
 * secret still has to come from somewhere with real `env` access, which
 * `base.config.ts` itself never has, so a real implementation's body
 * would call out to a small server-only module for the actual send, and
 * only pass the thin wrapper function in here.
 */
export type HandleEmailFn = (email: FormBuilderEmail) => Promise<void>

export type FormBuilderPluginOptions = {
	/**
	 * Matches Payload's own `beforeEmail` hook shape exactly: called with
	 * every interpolated email about to be handled for one submission,
	 * returns the (possibly transformed) list, e.g. to wrap `html` in a
	 * shared template. Must stay pure/isomorphic-safe like any other Tier-1
	 * hook (see `CollectionHooks`' own doc comment, `@baseconfig/core`'s
	 * `base.types.ts`): it only ever transforms data that's already been
	 * computed, it doesn't send anything itself.
	 */
	beforeEmail?: (
		emails: FormBuilderEmail[],
		ctx: { doc: Record<string, unknown> }
	) => FormBuilderEmail[]
	/** See `HandleEmailFn`'s own doc comment: the one call, right here, that wires up this plugin's actual email sending. */
	handleEmail?: HandleEmailFn
	/**
	 * **An extension point only, not implemented in this pass.** Payload's
	 * own form-builder pairs this with a real `payment` field type
	 * (`basePrice`/`priceConditions`) and a price-calculation utility; this
	 * package has neither yet (a real payment integration is a materially
	 * bigger, separate feature: real money, real compliance surface). The
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

/** Read by `endpoints.ts` at request time: every option `formBuilderPlugin()` was configured with, including `handleEmail`. */
export function getFormBuilderOptions(): FormBuilderPluginOptions {
	return registeredOptions
}

/**
 * Adds the `forms`/`form-submissions` collections, the `form` block, *and*
 * the public submission endpoint to the config: **the one, only place a
 * consumer configures this plugin**, including `handleEmail`, no second,
 * separate `createHandler()` param required for any of it. Modeled on
 * Payload's own `@payloadcms/plugin-form-builder`, itself "just a plugin"
 * built on Payload's own public collection API, same idea here: this
 * calls the normal `defineCollection()`/block-registry factories, no
 * special-cased bypass.
 *
 * **How the public half (`formBuilderEndpoints`, needs `db`, a real
 * binding this isomorphic config can never have, see `EndpointFactory`'s
 * own doc comment, `@baseconfig/core`'s `db/content-route.ts`) still ends up
 * wired without a second call**: rather than building real endpoints here,
 * this pushes the *function* `formBuilderEndpoints` itself into
 * `config.endpointFactories`, a plain function reference is
 * isomorphic-safe to merely *exist* in the config (it only touches a
 * binding once actually *called*, and it's only ever called from
 * `createHandler()`, server-only). `createHandler()` invokes every
 * registered factory with `{db}`, `formBuilderEndpoints` reads
 * `handleEmail` back off `getFormBuilderOptions()` itself, the same
 * registry `options` (including `beforeEmail`/`handlePayment`) already
 * round-trips through, rather than needing it injected as a binding, so
 * `www/src/api/index.ts` never imports anything from this package at all
 * beyond `formBuilderEndpoints` being reachable through
 * `config.endpointFactories`, and a plain `import '@/config/base.config'`
 * for its side effect (see `@baseconfig/core`'s own CLAUDE.md, "The
 * circular-import trap," for why that one import is required, without
 * it, `createHandler()` can read an empty registry if nothing else has
 * evaluated `base.config.ts` first).
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
