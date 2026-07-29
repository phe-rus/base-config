import type { AdminSettings } from '../../base.types'
import { AdminConfigContext } from '../functions/context'
import { useAdminSession } from '../functions/session-query'
import { collectionsBySlug, globalsBySlug } from '../../collections/registry'
import type { CollectionSlug } from '../../collections/types'
import {
	contentCollections,
	draftCollections,
	getAuthClient,
	unwrap,
	type BetterAuthAdminClient,
	type ContentCollection,
	type DraftCollection
} from '../../db/collections'
import { Button } from '@base/ui/components/button'
import { cn } from '@base/ui/lib/utils'
import { IconLayoutSidebarInactive } from '@tabler/icons-react'
import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type PropsWithChildren } from 'react'

// Collections and globals share one flat URL structure — `/admin/<slug>`,
// `/admin/<slug>/<id>` only ever applying to a real collection document
// (see `admin/views/provider.tsx`'s `resolveRouteView`) — so one path
// pattern resolves both.
const ADMIN_PATH = /^\/admin\/([a-z-]+)(?:\/([^/]+))?/

type BreadcrumbSegment = {
	key: string
	label: string
	href: string
}

type ItemSegment = {
	collection: ContentCollection
	draftCollection: DraftCollection
	itemId: string
	href: string
}

/**
 * Static part of the breadcrumb (collection/global name, both known from the
 * URL + registry alone) plus, when the URL points at one document, enough to
 * resolve its own segment separately. Deliberately doesn't touch
 * `useLiveQuery` here — that only happens client-side in `ItemBreadcrumb`
 * below, so this hook (and the `Topbar` that calls it) stays safe to render
 * during SSR.
 */
function useBreadcrumbBase(
	pathname: string,
	adminPath: string
): {
	segments: BreadcrumbSegment[]
	itemSegment?: ItemSegment
} {
	const [, slug, itemId] = pathname.match(ADMIN_PATH) ?? []

	const collectionConfig = slug
		? (
				collectionsBySlug as Record<string, (typeof collectionsBySlug)['pages']>
			)[slug]
		: undefined
	const globalConfig = slug
		? (globalsBySlug as Record<string, (typeof globalsBySlug)['topbar']>)[slug]
		: undefined

	// `pherus` always leads the breadcrumb — it's the admin root, not tied to
	// any particular collection/global.
	const segments: BreadcrumbSegment[] = [
		{ key: 'pherus', label: 'pherus', href: `/${adminPath}` }
	]
	if ((collectionConfig || globalConfig) && slug) {
		segments.push({ key: slug, label: slug, href: `/${adminPath}/${slug}` })
	}

	const itemSegment: ItemSegment | undefined =
		collectionConfig && slug && itemId
			? {
					collection: contentCollections[slug as CollectionSlug],
					draftCollection: draftCollections[slug as CollectionSlug],
					itemId,
					href: `/${adminPath}/${slug}/${itemId}`
				}
			: undefined

	return { segments, itemSegment }
}

/** Mounted-gated: `useLiveQuery` only ever runs client-side, after hydration — never during SSR, which is what was crashing (`useSyncExternalStore` needs a `getServerSnapshot` this library doesn't provide). */
function ItemBreadcrumb({
	collection,
	draftCollection,
	itemId,
	href
}: ItemSegment) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	return (
		<span className='flex items-center gap-1'>
			<span>/</span>
			{mounted ? (
				<ItemBreadcrumbLive
					collection={collection}
					draftCollection={draftCollection}
					itemId={itemId}
					href={href}
				/>
			) : (
				<span className='text-muted-foreground'>…</span>
			)}
		</span>
	)
}

/**
 * A document's own local draft (`useDocument`'s write-through target — see
 * `db/use-document.ts`) is what actually reflects what the admin is typing
 * right now; the remote collection only ever catches up once "Publish"/
 * "Commit & push" is clicked. Reading the remote collection alone (as this
 * used to) meant a never-yet-published document — or a published one with
 * unsaved local edits on top — showed a breadcrumb stuck on "untitled"
 * forever, the same remote-only gap `CollectionTable`'s list view had.
 * Prefers the draft's `slug` and falls back to the remote row's, matching
 * `useDocument`'s own `initialValue` precedence.
 */
function ItemBreadcrumbLive({
	collection,
	draftCollection,
	itemId,
	href
}: ItemSegment) {
	const { data } = useLiveQuery(collection)
	const { data: draftData } = useLiveQuery(draftCollection)

	const remoteSlug = (
		data.find((row) => row.id === itemId)?.data as { slug?: string } | undefined
	)?.slug
	const draftSlug = (
		draftData.find((row) => row.id === itemId)?.data as
			| { slug?: string }
			| undefined
	)?.slug

	const slug = draftSlug || remoteSlug

	return (
		// `href` is a resolved literal path, not a typed route pattern
		<Link to={href as any}>{slug || 'untitled'}</Link>
	)
}

/**
 * Split out from `Topbar` itself so `useSession()` (a real hook) is only
 * ever called from a subtree that's *conditionally rendered as a whole*
 * (`{authClient && <SessionGreeting authClient={authClient} />}` below) —
 * never conditionally *called*, which would break React's rules of hooks.
 * Real, live reactive read (better-auth's own `useSession()`, see
 * `BetterAuthAdminClient`'s own doc comment) rather than a `sessions` prop
 * a consumer's own route loader used to have to thread down just for this
 * one display — same self-contained shape the sign-out mutation already has.
 */
function SessionGreeting({
	authClient
}: {
	authClient: BetterAuthAdminClient
}) {
	const { data: session } = authClient.useSession()
	return <p className='hidden md:flex text-sm!'>Holla, {session?.user?.name}</p>
}

type TopbarProps = PropsWithChildren<{
	config: AdminSettings
}>

/**
 * `useAdminSession()` (`admin/functions/session-query.ts`) is the one
 * shared, deduplicated session read every admin gate uses — see its own
 * doc comment for why this replaced a raw `authClient.useSession()` call
 * here (real, confirmed duplicate `/api/auth/get-session` traffic once
 * `ProviderView.Context`/`Dashboard` each independently subscribed too).
 * `AdminConfigContext` is provided above both branches — it's plain app
 * config (`adminPath`/`adminIcon`/`socialProviders`), not chrome, and
 * `useAdminConfig()` is called unconditionally by things that render either
 * way (e.g. `Entry`'s own `navigate` fallback, still needed when it
 * dispatches to a reserved auth-screen mode with no session). No chrome at
 * all while `hasSession` is false — the reserved-`$collection` auth
 * screens (resolved by `provider.tsx`) render themselves, unwrapped. A
 * session that exists but has the wrong `role` still gets a real redirect
 * to `/` — the one piece of the old loader-based guard
 * (`(admin)/route.tsx` used to call `adminLoader()`) that's still real
 * gating, just moved here since a `loader` can't call a hook.
 */
export function Topbar({ children, config }: TopbarProps) {
	const authClient = getAuthClient()
	const { data: session, hasSession } = useAdminSession()
	const navigate = useNavigate()

	useEffect(() => {
		if (session && session.user.role !== 'admin') {
			navigate({
				to: '/',
				replace: true,
				search: { msg: 'You are not authorized to access this page' } as any
			})
		}
	}, [session, navigate])

	return (
		<AdminConfigContext.Provider value={config}>
			{hasSession ? (
				<TopbarChrome authClient={authClient} config={config}>
					{children}
				</TopbarChrome>
			) : (
				<>{children}</>
			)}
		</AdminConfigContext.Provider>
	)
}

function TopbarChrome({
	children,
	config,
	authClient
}: PropsWithChildren<{
	config: AdminSettings
	authClient: BetterAuthAdminClient | undefined
}>) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname
	})
	const { segments, itemSegment } = useBreadcrumbBase(
		pathname,
		config.adminPath
	)
	const navigate = useNavigate()
	const { mutate: handleSignOut, isPending: signingOut } = useMutation({
		mutationFn: async () => {
			if (!authClient) {
				throw new Error(
					'Sign-out was clicked but no `auth` was passed to baseConfig() — see BaseConfigProps["auth"].'
				)
			}
			return unwrap(await authClient.signOut())
		},
		onSuccess: () => {
			navigate({ to: '/admin/login', replace: true, reloadDocument: true })
		}
	})

	return (
		<>
			<header id='topbar' className='sticky top-0 z-35 truncate bg-background'>
				<section className='px-5 flex items-center justify-between h-9'>
					<div className='flex items-center gap-5'>
						<IconLayoutSidebarInactive className='size-4.5 cursor-pointer' />
						<nav className='flex items-center gap-5'>
							{/* `href` is a resolved literal path (from `config.adminPath`), not a typed route pattern */}
							<Link
								to={`/${config.adminPath}` as any}
								className='hidden md:flex text-sm!'
							>
								<img src={config.adminIcon} alt='logo' className='size-4' />
							</Link>
							<div
								className={cn(
									'flex items-center gap-1 overflow-x-auto',
									'text-xs max-w-38 md:max-w-fit',
									'no-scrollbar lowercase'
								)}
							>
								{segments.map((segment, index) => (
									<span key={segment.key} className='flex items-center gap-1'>
										{index > 0 && <span>/</span>}
										<Link
											// `segment.href` is a resolved literal path, not a typed route pattern
											to={segment.href as any}
											className={cn(
												(index < segments.length - 1 || itemSegment) &&
													'text-muted-foreground'
											)}
										>
											{segment.label}
										</Link>
									</span>
								))}
								{itemSegment && <ItemBreadcrumb {...itemSegment} />}
							</div>
						</nav>
					</div>

					<nav className='flex items-center gap-2'>
						{authClient && <SessionGreeting authClient={authClient} />}
						{authClient && (
							<Button
								variant='destructive'
								size='sm'
								disabled={signingOut}
								onClick={() => handleSignOut()}
							>
								{signingOut ? 'Signing out...' : 'Sign out'}
							</Button>
						)}
					</nav>
				</section>
			</header>
			{children}
		</>
	)
}
