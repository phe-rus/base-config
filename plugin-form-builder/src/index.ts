// `formBuilderPlugin({...})` (in `base.config.ts`) configures every
// isomorphic-safe option (`beforeEmail`/`handlePayment`). `handleEmail`
// isn't one of them — it's configured directly on `@base/config`'s own
// `createHandler({handleEmail})`, in the consumer's server-only API entry
// — see `HandleEmailFn`'s own doc comment (`plugin.ts`) for the full
// reasoning. This package ships no built-in email implementation of its
// own (no Cloudflare binding, no Resend, nothing) — `handleEmail` is a
// bring-your-own extension point, deliberately.
export { formBuilderPlugin } from './plugin'
export type {
	FormBuilderEmail,
	FormBuilderPluginOptions,
	HandleEmailFn
} from './plugin'
export { formBuilderEndpoints } from './endpoints'
export type { FormData, FormEmailRow, FormFieldRow } from './forms-collection'
export { formBlock, formBlockSchema } from './form-block'
