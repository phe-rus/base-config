import { redirect } from '@tanstack/react-router'

type GuardSession = { user: { role?: string | null } } | null | undefined

/** Where the admin dashboard and its own login screen live: the one convention every default in this file (and `Topbar`'s sign-out mutation, and every admin auth view's own href defaults) is already built around. Not exported as configurable further than these two functions' own `options`. A consumer that genuinely mounts the admin dashboard somewhere else can still fall back to calling `requireAdminSession`/`redirect` directly. */
const DEFAULT_ADMIN_PATH = '/admin'
const DEFAULT_LOGIN_PATH = '/admin/login'

export type AdminSessionGuardOptions = {
	/** Where to send an unauthenticated visitor. Defaults to `/admin/login`. */
	loginTo?: string
	/** Where to send an authenticated visitor lacking the required role. Defaults to `/`. */
	unauthorizedTo?: string
	/** Role required to pass. Defaults to `'admin'`, matching `better-auth`'s `admin()` plugin default role. */
	role?: string
	/** Forwarded as `?msg=` on the unauthorized redirect, for a route that toasts it. */
	unauthorizedMessage?: string
}

/**
 * The session-gate mechanism behind an `(admin)`-style route group: no
 * session → bounce to `loginTo`; wrong role → bounce to `unauthorizedTo`.
 * Kept structural on the session type on purpose: this package has no
 * dependency on any particular auth library (see `admin/views/topbar.tsx`'s
 * `sessions` prop for the same reasoning). Exported directly for a consumer
 * that wants to call it from their own hand-written `loader`; `adminLoader`
 * below is the ready-made version most consumers actually want.
 */
export function requireAdminSession<TSession extends GuardSession>(
	session: TSession,
	options: AdminSessionGuardOptions = {}
): { session: NonNullable<TSession> } {
	const {
		loginTo = DEFAULT_LOGIN_PATH,
		unauthorizedTo = '/',
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

/**
 * The actual value an `(admin)`-style route group assigns to its own
 * `loader`, not just the gate logic (`requireAdminSession` above) but the
 * `({context: {session}}) => ...` wiring around it too, so a consumer's
 * route file needs zero session-guard code of its own:
 * `loader: adminLoader({unauthorizedMessage: '...'})`. `TSession` is only
 * ever inferred from how the *consumer's* router context types this
 * loader's own parameter; there's nothing to pass explicitly.
 */
export function adminLoader<TSession extends GuardSession>(
	options: AdminSessionGuardOptions = {}
) {
	return ({ context }: { context: { session: TSession } }) =>
		requireAdminSession(context.session, options)
}

/**
 * The inverse of `adminLoader`: for an `(auth)`-style route group's own
 * `loader`, bouncing an already-signed-in visitor away from the sign-in/
 * sign-up/reset screens before they ever render: `loader:
 * redirectIfAuthenticated()`. `to` defaults to the admin dashboard's own
 * root (`/admin`), matching `adminLoader`'s own `loginTo` default's implicit
 * "the dashboard lives at `/admin`" convention.
 */
export function redirectIfAuthenticated<TSession extends GuardSession>(
	to: string = DEFAULT_ADMIN_PATH
) {
	return ({ context }: { context: { session: TSession } }) => {
		if (context.session) {
			throw redirect({ to: to as any, replace: true })
		}
	}
}
