// The admin UI shell's own barrel — a consumer wires up its file-based
// routes against these exports instead of reaching into individual files
// under `admin/*`. Organized internally by concern (`views/` — rendered
// components; `functions/` — pure logic, no JSX; `widgets/` — small
// focused action surfaces, as opposed to `views/`'s full pages). Every
// route-mounted view (one a consumer wires directly as a route's
// `component`) gets its own folder with a single `component.tsx` inside
// (`dashboard/`, `storage/`), or — for `Entry`, the `$collection/$` splat
// route's dispatcher — a flat file, grouped under one `ContextView`
// namespace (`ContextView.Entry`, not a separate barrel export) — mirroring
// Payload's own `ListView/index.tsx` convention, and how compound
// components group a set of related pieces under one name. `ProviderView`
// is the sibling namespace a consumer wraps the `$collection` layout route
// with, resolving the state `Entry` reads via `useRouteView()`.

export { Topbar } from './views/topbar'
export { requireAdminSession } from './functions/guard'
export type { AdminSessionGuardOptions } from './functions/guard'
export { CollectionForm } from './views/collection-form'
export { CollectionTable } from './views/collection-table'
export { GlobalForm } from './views/global-form'
export { ContextView } from './views/context-view'
export { ProviderView } from './views/provider'
export { LoginView } from './views/login-view'
export type { LoginFormValues } from './views/login-view'
export { CreateAccountView } from './views/create-account-view'
export type { CreateAccountFormValues } from './views/create-account-view'
