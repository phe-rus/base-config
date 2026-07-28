// `formBuilderPlugin({...})` (in `base.config.ts`) configures every
// isomorphic-safe option; `onFormBuilderEmail()` (called once from the
// consumer's own server entry) is the one, single, always-server-only
// place `handleEmail` is wired — see `plugin.ts`'s own doc comments for
// the full reasoning. This package ships no built-in email implementation
// of its own (no Cloudflare binding, no Resend, nothing) — `handleEmail`
// is a bring-your-own extension point, deliberately.
export { formBuilderPlugin, onFormBuilderEmail } from './plugin'
export type {
	FormBuilderEmail,
	FormBuilderPluginOptions,
	HandleEmailFn
} from './plugin'
export { formBuilderEndpoints } from './endpoints'
export type { FormData, FormEmailRow, FormFieldRow } from './forms-collection'
export { formBlock, formBlockSchema } from './form-block'
