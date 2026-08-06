import { DefaultLoader } from '@/components/bounderies/default-loader'
import {
	buildDocTree,
	flattenDocTree,
	RenderNav,
	resolveActiveDoc
} from '@/components/renderers'
import { cn } from '@/lib/cn'
import { base } from '@baseconfig/core'
import { Preview } from '@baseconfig/ui/basiccn'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useMemo } from 'react'

export const Route = createFileRoute('/(frontend)/(pages)/docs/')({
	loaderDeps: ({ search }) => ({
		slug: (search as { slug?: string }).slug
	}),
	loader: async ({ context, deps }) => {
		const docLists = await context.query.ensureQueryData(
			base.find({ collection: 'docs' })
		)
		const catagoryLists = await context.query.ensureQueryData(
			base.findGlobal({ slug: 'category' })
		)

		const categories = catagoryLists?.data?.category ?? []
		const tree = buildDocTree(docLists?.docs ?? [], categories)
		const activeDoc = resolveActiveDoc(docLists?.docs ?? [], tree, deps.slug)

		return { activeDoc }
	},
	// Same OG/Twitter shape `(pages)/$.tsx` builds for a real page, sourced
	// from `activeDoc.data.metadata` (the docs collection's own `meta`
	// field, `www/src/config/collections/docs.ts`'s `metadata` tab) instead
	// of a page's. Falls back to the doc's own `title` when no SEO title was
	// set, so a doc with no metadata filled in still gets a real `<title>`
	// rather than none at all.
	head: ({ loaderData }) => {
		const doc = loaderData?.activeDoc
		if (!doc) {
			return {
				title: 'Doc not found',
				meta: [
					{ property: 'og:title', content: 'Doc not found' },
					{ name: 'twitter:title', content: 'Doc not found' },
					{ property: 'og:type', content: 'article' },
					{
						property: 'og:url',
						content: `${import.meta.env.VITE_ORIGIN}/docs`
					},
					{ property: 'og:site_name', content: 'Baseconfig' },
					{ name: 'twitter:card', content: 'summary_large_image' }
				]
			}
		}
		const meta = doc.data?.metadata
		const title = meta?.title ?? doc.title
		return {
			meta: [
				...(title ? [{ title }] : []),
				...(meta?.description ? [{ description: meta?.description }] : []),
				...(meta?.image?.url ? [{ image: meta?.image?.url }] : []),
				...(title
					? [
							{ property: 'og:title', content: title },
							{ name: 'twitter:title', content: title }
						]
					: []),
				// canonical
				{
					rel: 'canonical',
					href: `${import.meta.env.VITE_ORIGIN}/docs${
						doc.slug ? `?slug=${doc.slug}` : ''
					}`
				},
				...(meta?.description
					? [
							{ property: 'og:description', content: meta?.description },
							{ name: 'twitter:description', content: meta?.description }
						]
					: []),
				...(meta?.image?.url
					? [{ property: 'og:image', content: meta?.image?.url }]
					: []),
				{ property: 'og:type', content: 'article' },
				{
					property: 'og:url',
					content: `${import.meta.env.VITE_ORIGIN}/docs${
						doc.slug ? `?slug=${doc.slug}` : ''
					}`
				},
				{ property: 'og:site_name', content: 'Baseconfig' },
				{ name: 'twitter:card', content: 'summary_large_image' }
			],
			scripts: [
				{
					type: 'application/ld+json',
					children: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: doc.title,
						description: doc.data.metadata?.description,
						image: doc.data.metadata?.image?.url
							? `${import.meta.env.VITE_ORIGIN}${doc.data.metadata.image.url}`
							: ``,
						author: {
							'@type': 'Person',
							name: doc.data.author?.name,
							email: doc.data.author?.email
						},
						publisher: {
							'@type': 'Organization',
							name: 'Baseconfig',
							logo: {
								'@type': 'ImageObject',
								url: `${import.meta.env.VITE_ORIGIN}/favicon.png`
							}
						},
						datePublished: doc.createdAt,
						dateModified: doc.updatedAt
					})
				}
			]
		}
	},
	pendingComponent: DefaultLoader,
	component: RouteComponent
})

function RouteComponent() {
	const { slug } = Route.useSearch()
	const { data: docLists } = useSuspenseQuery(base.find({ collection: 'docs' }))
	const { data: catagoryLists } = useSuspenseQuery(
		base.findGlobal({ slug: 'category' })
	)

	const categories = catagoryLists?.data?.category ?? []

	const tree = useMemo(
		() => buildDocTree(docLists?.docs ?? [], categories),
		[docLists, categories]
	)
	const renderActive = useMemo(
		() => resolveActiveDoc(docLists?.docs ?? [], tree, slug),
		[docLists, tree, slug]
	)

	// Same reading order the sidebar itself renders in, so "next" always
	// means "the next thing down in the nav you're already looking at."
	const flatDocs = useMemo(() => flattenDocTree(tree), [tree])
	const activeIndex = useMemo(
		() => flatDocs.findIndex((doc) => doc.id === renderActive?.id),
		[flatDocs, renderActive]
	)
	const prevDoc = activeIndex > 0 ? flatDocs[activeIndex - 1] : undefined
	const nextDoc =
		activeIndex >= 0 && activeIndex < flatDocs.length - 1
			? flatDocs[activeIndex + 1]
			: undefined

	return (
		<article
			className={cn(
				'relative container flex flex-col',
				'min-h-svh md:flex-row'
			)}
		>
			<aside
				className={cn(
					'flex flex-col overflow-y-auto no-scrollbar',
					'py-5',
					// A fixed width (not just nowrap) so a long title truncates in
					// place instead of growing the whole column and pushing the
					// content beside it.
					'md:w-56 md:shrink-0',
					// Below `md`, the aside is a plain block stacked above the
					// content, no sticky positioning, no fixed height, nav content
					// just flows (now compact anyway, categories default collapsed).
					// At `md` and up it sticks right at the topbar's own real
					// height (`top-10`/`h-10` on Topbar itself, `components/topbar`)
					// and never scrolls the page past it, only its own overflow.
					'md:sticky md:top-10 md:h-[calc(100vh-2.5rem)]'
				)}
			>
				{docLists?.docs ? (
					<nav className={cn('flex flex-col', 'gap-1')}>
						<RenderNav
							nodes={tree}
							activeSlug={renderActive?.slug ?? undefined}
						/>
					</nav>
				) : null}
			</aside>

			<section
				className={cn('flex flex-col gap-5 w-full mx-auto', 'md:max-w-lg py-5')}
			>
				{renderActive ? (
					<>
						<div className='flex flex-col'>
							<h1 className={cn('text-2xl', 'font-bold')}>
								{renderActive.title}
							</h1>
							<div
								className={cn(
									'flex items-center gap-2',
									'text-xs text-muted-foreground'
								)}
							>
								<span className={cn('font-semibold', 'text-primary')}>
									slug:
								</span>{' '}
								{renderActive.slug}
							</div>
							<div
								className={cn(
									'flex items-center gap-3',
									'text-xs text-muted-foreground'
								)}
							>
								<div className={cn('flex items-center', 'gap-1')}>
									<span className={cn('font-semibold', 'text-primary')}>
										update:
									</span>
									<span>{format(renderActive.updatedAt, 'PPP')}</span>
								</div>
								<span className={cn('text-xs', 'text-muted-foreground')}>
									•
								</span>
								<div className={cn('flex items-center', 'gap-1')}>
									<span className={cn('font-semibold', 'text-primary')}>
										created:
									</span>
									<span>{format(renderActive.createdAt, 'PPP')}</span>
								</div>
							</div>
						</div>
						<Preview content={renderActive.data.body} className='w-full' />

						{prevDoc || nextDoc ? (
							<nav
								className={cn(
									'flex items-center justify-between gap-3',
									'border-t pt-5 mt-5'
								)}
							>
								{prevDoc ? (
									<Link
										to='/docs'
										search={{ slug: prevDoc.slug ?? undefined }}
										className={cn(
											'group flex flex-col items-start',
											'gap-1 text-sm'
										)}
									>
										<span
											className={cn(
												'flex items-center gap-1',
												'text-xs text-muted-foreground'
											)}
										>
											<IconArrowLeft className='size-3.5' />
											Previous
										</span>
										<span
											className={cn('font-medium', 'group-hover:text-primary')}
										>
											{prevDoc.title}
										</span>
									</Link>
								) : (
									<span />
								)}
								{nextDoc ? (
									<Link
										to='/docs'
										search={{ slug: nextDoc.slug ?? undefined }}
										className={cn(
											'group flex flex-col items-end',
											'gap-1 text-sm text-right'
										)}
									>
										<span
											className={cn(
												'flex items-center gap-1',
												'text-xs text-muted-foreground'
											)}
										>
											Next
											<IconArrowRight className='size-3.5' />
										</span>
										<span
											className={cn('font-medium', 'group-hover:text-primary')}
										>
											{nextDoc.title}
										</span>
									</Link>
								) : null}
							</nav>
						) : null}
					</>
				) : (
					<div className={cn('flex flex-col', 'gap-2')}>
						<h1 className={cn('text-2xl', 'font-bold')}>Doc not found</h1>
						<p className={cn('text-sm', 'text-muted-foreground')}>
							{slug ? (
								<>
									The doc <code>{slug}</code> doesn't exist, it may have been
									renamed or removed.
								</>
							) : (
								'No docs have been published yet.'
							)}
						</p>
					</div>
				)}
			</section>
		</article>
	)
}
