import type { AdminSettings } from '../../base.types'

let registeredAdminConfig: AdminSettings | undefined

/** Call once, client-side — `baseConfig()` does this unconditionally. Same plain-registry pattern as `db/collections.ts`'s `registerUsersDataSource`/`getAuthClient`, not React context: the admin auth screens (`LoginView`/`CreateAccountView`/`ForgotPasswordView`/`ResetPasswordView`) render *before* any session exists, so there's no `<Topbar>`-equivalent layout boundary already sitting above them to hang a context provider on — but `AdminSettings` is a single, static, app-wide object anyway, exactly the kind of thing a plain registry (rather than a provider threaded through a specific subtree) fits. */
export function registerAdminConfig(config: AdminSettings) {
	registeredAdminConfig = config
}

/** `undefined` only if `baseConfig()` was never called — shouldn't happen in practice, since every consumer's root config module runs before any admin route renders. */
export function getAdminConfig(): AdminSettings | undefined {
	return registeredAdminConfig
}
