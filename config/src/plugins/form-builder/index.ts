// A consumer needs both halves — see `plugin.ts`'s own doc comment for why
// this couldn't be collapsed into one call.
export { formBuilderPlugin } from './plugin'
export { formBuilderEndpoints } from './endpoints'
export type { SendEmailFn, FormBuilderEndpointsOptions } from './endpoints'
export type { FormData, FormEmailRow, FormFieldRow } from './forms-collection'
