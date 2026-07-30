import type { BaseConfigProps, Plugin } from '@baseconfig/core'
import { formBlock } from './form-block'
import { formBuilderEndpoints } from './endpoints'
import { formSubmissionsCollection } from './form-submissions-collection'
import { formsCollection } from './forms-collection'

/** One outgoing email, right before it's actually handled — see `beforeEmail`'s own doc comment below. */
export type FormBuilderEmail = {
	to: string
	from: string
	subject: string
	html: string
}

/**
 * This plugin's own email contract, matching `@baseconfig/core`'s own
 * `CreateHandlerOptions['handleEmail']` structurally (that's the *only*
 * place a real implementation is ever configured — `createHandler({handleEmail})`
 * in the consumer's own server-only API entry, never here, never in
 * `base.config.ts`) — and deliberately **no built-in implementation
 * shipped anywhere in this repo**: not Cloudflare's own `env.EMAIL`
 * binding, not Resend, nothing. Every real option here has its own
 * cost/plan model; this plugin doesn't pick one for you. "Bring your own":
 * wire it up to whatever you actually want to pay for (or not) — Resend,
 * Postmark, a self-hosted SMTP relay, Cloudflare's own binding, or just a
 * `console.log` while you decide. This plugin only ever calls the
 * function, never cares how it's implemented.
 */
export type HandleEmailFn = (email: FormBuilderEmail) => Promise<void>

export type FormBuilderPluginOptions = {
	/**
	 * Matches Payload's own `beforeEmail` hook shape exactly: called with
	 * every interpolated email about to be handled for one submission,
	 * returns the (possibly transformed) list — e.g. to wrap `html` in a
	 * shared template. Must stay pure/isomorphic-safe like any other Tier-1
	 * hook (see `CollectionHooks`' own doc comment, `@baseconfig/core`'s
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

/** Read by `endpoints.ts` at request time — `formBuilderPlugin()`'s own isomorphic-safe options (`beforeEmail`/`handlePayment`). `handleEmail` isn't here at all — it comes from `createHandler({handleEmail})` directly, forwarded into `formBuilderEndpoints`' own `EndpointFactoryBindings` argument (see that function's own doc comment, `endpoints.ts`), never from this registry. */
export function getFormBuilderOptions(): FormBuilderPluginOptions {
	return registeredOptions
}

/**
 * Adds the `forms`/`form-submissions` collections, the `form` block, *and*
 * the public submission endpoint to the config — the one place a consumer
 * configures this plugin's own isomorphic-safe options (`beforeEmail`/
 * `handlePayment` — `handleEmail` is deliberately not one of them, see
 * `HandleEmailFn`'s own doc comment for where it's actually configured).
 * Modeled on Payload's own
 * `@payloadcms/plugin-form-builder`, itself "just a plugin" built on
 * Payload's own public collection API — same idea here: this calls the
 * normal `defineCollection()`/block-registry factories, no special-cased
 * bypass.
 *
 * **How the public half (`formBuilderEndpoints`, needs `db` — a real
 * binding this isomorphic config can never have, see `EndpointFactory`'s
 * own doc comment, `@baseconfig/core`'s `db/content-route.ts`) still ends up
 * wired without a second call**: rather than building real endpoints here,
 * this pushes the *function* `formBuilderEndpoints` itself into
 * `config.endpointFactories` — a plain function reference is
 * isomorphic-safe to merely *exist* in the config (it only touches a
 * binding once actually *called*, and it's only ever called from
 * `createHandler()`, server-only). `createHandler()` invokes every
 * registered factory with `{db, handleEmail}` — see
 * `CreateHandlerOptions['handleEmail']`'s own doc comment for why that one
 * extra field is threaded through too — so `www/src/api/index.ts` never
 * imports anything from this package at all beyond `formBuilderEndpoints`
 * being reachable through `config.endpointFactories`, and a plain
 * `import '@/config/base.config'` for its side effect (see `@baseconfig/core`'s
 * own CLAUDE.md, "The circular-import trap," for why that one import is
 * required — without it, `createHandler()` can read an empty registry if
 * nothing else has evaluated `base.config.ts` first).
 *
 * `options` round-trips the same way Tier-1 hooks do elsewhere in this
 * system: registered here as a side effect (`getFormBuilderOptions()`),
 * read back by `formBuilderEndpoints` once it's actually invoked.
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
