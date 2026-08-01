import { IconLoader2 } from '@tabler/icons-react'

/**
 * Shown by `Topbar` in place of both its own chrome and `{children}` while
 * `useAdminSession()` is still `isPending`: without this, every load/
 * refresh briefly resolved `hasSession` to `false` (pending and "no
 * session" were the same falsy state) and flashed the login screen at an
 * already-authenticated admin before the real session data arrived.
 * Deliberately renders *instead of* `{children}`, not around it: nothing
 * under `(admin)/route.tsx` (`Dashboard`, `ProviderView.Context`, `Entry`)
 * mounts until the session settles, so none of them need their own pending
 * branch.
 */
export function AdminLoading() {
	return (
		<div className='flex min-h-svh items-center justify-center bg-background'>
			<IconLoader2 className='size-6 animate-spin text-muted-foreground' />
		</div>
	)
}
