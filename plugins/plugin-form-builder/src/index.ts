// `formBuilderPlugin({...})` (in `base.config.ts`) is the one, only call
// that configures this plugin: `beforeEmail`/`handlePayment`/`handleEmail`
// all live right there, no second, separate `createHandler()` param for
// any of them. See `HandleEmailFn`'s own doc comment (`plugin.ts`) for why
// merely holding a `handleEmail` function reference here is isomorphic-safe.
// This package ships no built-in email implementation of its own (no
// Cloudflare binding, no Resend, nothing), `handleEmail` is a
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
