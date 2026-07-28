import type { AdminSettings } from '../../base.types'
import { AdminConfigContext } from '../functions/context'
import { collectionsBySlug, globalsBySlug } from '../../collections/registry'
import type { CollectionSlug } from '../../collections/types'
import {
	contentCollections,
	getAuthClient,
	unwrap,
	type ContentCollection
} from '../../db/collections'
import { Button } from '@base/ui/components/button'
import { cn } from '@base/ui/lib/utils'
import { IconLayoutSidebarInactive } from '@tabler/icons-react'
import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type FC, type PropsWithChildren } from 'react'

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
					itemId,
					href: `/${adminPath}/${slug}/${itemId}`
				}
			: undefined

	return { segments, itemSegment }
}

/** Mounted-gated: `useLiveQuery` only ever runs client-side, after hydration — never during SSR, which is what was crashing (`useSyncExternalStore` needs a `getServerSnapshot` this library doesn't provide). */
function ItemBreadcrumb({ collection, itemId, href }: ItemSegment) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	return (
		<span className='flex items-center gap-1'>
			<span>/</span>
			{mounted ? (
				<ItemBreadcrumbLive
					collection={collection}
					itemId={itemId}
					href={href}
				/>
			) : (
				<span className='text-muted-foreground'>…</span>
			)}
		</span>
	)
}

function ItemBreadcrumbLive({ collection, itemId, href }: ItemSegment) {
	const { data } = useLiveQuery(collection)
	const slug = (
		data.find((row) => row.id === itemId)?.data as { slug?: string } | undefined
	)?.slug

	return (
		// `href` is a resolved literal path, not a typed route pattern
		<Link to={href as any}>{slug || 'untitled'}</Link>
	)
}

type TopbarProps = PropsWithChildren<{
	/**
	 * Kept structural/minimal on purpose — this package has no dependency on
	 * any particular auth library, so it only ever reads `user.name`. Passed
	 * explicitly rather than fetched here so this stays a single value the
	 * consumer's own route loader already resolved once — not a live query
	 * this component re-fetches on its own.
	 */
	sessions?: { user?: { name?: string | null } | null } | null
	config: AdminSettings
}>

export const Topbar: FC<TopbarProps> = ({ sessions, children, config }) => {
	const pathname = useRouterState({
		select: (state) => state.location.pathname
	})
	const { segments, itemSegment } = useBreadcrumbBase(
		pathname,
		config.adminPath
	)
	const navigate = useNavigate()
	const authClient = getAuthClient()
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
			navigate({ to: '/', replace: true, reloadDocument: true })
		}
	})

	return (
		<AdminConfigContext.Provider value={config}>
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
						<p className='hidden md:flex text-sm!'>
							Holla, {sessions?.user?.name}
						</p>
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
		</AdminConfigContext.Provider>
	)
}
