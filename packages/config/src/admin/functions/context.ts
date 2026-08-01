import { createContext, useContext } from 'react'
import type { AdminSettings } from '../../base.types'

/**
 * Carries `config: AdminSettings` down to library-owned view components
 * (`views/*`) that a consumer mounts directly as a route's `component`.
 * Those files have no `www`-authored wrapper to prop-drill through, so they
 * read `config` from here instead. `Topbar` (the one component already
 * sitting at the right layout boundary; every admin route renders below
 * it) establishes the provider around its own `children`.
 */
export const AdminConfigContext = createContext<AdminSettings | undefined>(
	undefined
)

export function useAdminConfig(): AdminSettings {
	const config = useContext(AdminConfigContext)
	if (!config) {
		throw new Error(
			"useAdminConfig() called outside of <Topbar>: every `@baseconfig/core` page component must render below the admin route's <Topbar>."
		)
	}
	return config
}
