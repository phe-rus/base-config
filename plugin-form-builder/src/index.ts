// One call configures everything — see `plugin.ts`'s own doc comment for
// how the public half (`formBuilderEndpoints`, exported mainly for advanced/
// manual composition) ends up wired without a consumer ever calling it
// directly.
export { formBuilderPlugin } from './plugin'
export type { FormBuilderEmail, FormBuilderPluginOptions } from './plugin'
export { formBuilderEndpoints } from './endpoints'
export type { FormData, FormEmailRow, FormFieldRow } from './forms-collection'
export { formBlock, formBlockSchema } from './form-block'
