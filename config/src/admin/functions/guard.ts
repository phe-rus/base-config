import { redirect } from '@tanstack/react-router'

export type AdminSessionGuardOptions = {
	/** Where to send an unauthenticated visitor, e.g. `/auth`. */
	loginTo: string
	/** Where to send an authenticated visitor lacking the required role, e.g. `/`. */
	unauthorizedTo: string
	/** Role required to pass. Defaults to `'admin'`, matching `better-auth`'s `admin()` plugin default role. */
	role?: string
	/** Forwarded as `?msg=` on the unauthorized redirect, for a route that toasts it. */
	unauthorizedMessage?: string
}

/**
 * The session-gate mechanism behind an `(admin)`-style route group: no
 * session → bounce to `loginTo`; wrong role → bounce to `unauthorizedTo`.
 * Kept structural on the session type on purpose — this package has no
 * dependency on any particular auth library (see `admin/views/topbar.tsx`'s
 * `sessions` prop for the same reasoning). Meant to be called directly from
 * a route's `loader`, e.g. `loader: ({context: {session}}) =>
 * requireAdminSession(session, {loginTo: '/auth', unauthorizedTo: '/'})`.
 */
export function requireAdminSession<
	TSession extends { user: { role?: string | null } } | null | undefined
>(
	session: TSession,
	options: AdminSessionGuardOptions
): { session: NonNullable<TSession> } {
	const {
		loginTo,
		unauthorizedTo,
		role = 'admin',
		unauthorizedMessage
	} = options

	if (!session) {
		// `loginTo` is a runtime string, not a statically known route pattern.
		throw redirect({ to: loginTo as any, replace: true })
	}
	if (session.user.role !== role) {
		throw redirect({
			to: unauthorizedTo as any,
			replace: true,
			search: unauthorizedMessage
				? ({ msg: unauthorizedMessage } as any)
				: undefined
		})
	}

	return { session: session as NonNullable<TSession> }
}
