// The admin UI shell's own barrel: a consumer wires up its file-based
// routes against these exports instead of reaching into individual files
// under `admin/*`. Organized internally by feature, not file type:
// `views/auth/` (the admin auth screens), `views/document/` (collection/
// global CRUD UI), `views/dispatch/` (the `$collection/$` route-resolution
// layer, `RouteViewState`/`ProviderView`/`ContextView.Entry`), plus
// `views/dashboard/`, `views/storage/` (each a route-mounted view with its
// own folder, single `component.tsx` inside), and `views/render-view.tsx`/
// `views/topbar.tsx` (shared chrome primitives used across those features,
// so they stay flat rather than living inside any one feature folder).
// `functions/`: pure logic, no JSX; `widgets/`: small focused action
// surfaces, as opposed to `views/`'s full pages. `ContextView.Entry` (the
// `$collection/$` splat route's dispatcher) is grouped under one
// `ContextView` namespace rather than its own barrel export, mirroring
// Payload's own `ListView/index.tsx` convention, and how compound
// components group a set of related pieces under one name. `ProviderView`
// is the sibling namespace a consumer wraps the `$collection` layout route
// with, resolving the state `Entry` reads via `useRouteView()`.

export { Topbar } from './views/topbar'
export {
	requireAdminSession,
	adminLoader,
	redirectIfAuthenticated
} from './functions/guard'
export type { AdminSessionGuardOptions } from './functions/guard'
export {
	createSessionQueryOptions,
	useSession,
	useSignOut
} from './functions/session-query'
export { CollectionForm, CollectionTable, GlobalForm } from './views/document'
export { ContextView, ProviderView } from './views/dispatch'
export {
	LoginView,
	type LoginFormValues,
	CreateAccountView,
	type CreateAccountFormValues,
	ForgotPasswordView,
	ResetPasswordView
} from './views/auth'
