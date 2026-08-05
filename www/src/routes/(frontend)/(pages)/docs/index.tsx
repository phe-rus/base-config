import { DefaultLoader } from '@/components/bounderies/default-loader'
import { buildDocTree, getFirstDoc, RenderNav } from '@/components/renderers'
import { cn } from '@/lib/cn'
import { base } from '@baseconfig/core'
import { Preview } from '@baseconfig/ui/basiccn'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useMemo } from 'react'

export const Route = createFileRoute('/(frontend)/(pages)/docs/')({
	loader: async ({ context }) => {
		await context.query.ensureQueryData(base.find({ collection: 'docs' }))
		await context.query.ensureQueryData(base.findGlobal({ slug: 'category' }))
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
	const firstDoc = useMemo(() => getFirstDoc(tree), [tree])
	const renderActive = useMemo(() => {
		if (!slug) return firstDoc ?? docLists?.docs?.[0]

		const match = docLists?.docs?.find((doc) => doc.slug === slug)
		if (match) return match

		const parentSlug = slug.split('/')[0]
		return docLists?.docs?.find((doc) => doc.slug === parentSlug)
	}, [docLists, slug, firstDoc])

	return (
		<article className='relative container flex'>
			<aside
				className={cn(
					'flex flex-col text-nowrap!',
					'sticky top-10 py-5 h-[calc(100vh-100px)]'
				)}
			>
				{docLists?.docs ? (
					<nav className='flex flex-col gap-1'>
						<RenderNav nodes={tree} />
					</nav>
				) : null}
			</aside>

			<section
				className={cn('flex flex-col gap-5 w-full mx-auto', 'md:max-w-lg py-5')}
			>
				<div className='flex flex-col'>
					<h1 className='text-2xl font-bold'>{renderActive?.title}</h1>
					<div className='flex items-center gap-2 text-xs text-muted-foreground'>
						<span className='font-semibold text-primary'>slug:</span>{' '}
						{renderActive?.slug}
					</div>
					<div className='flex items-center gap-3 text-xs text-muted-foreground'>
						<div className='flex items-center gap-1'>
							<span className='font-semibold text-primary'>update:</span>
							<span>{format(renderActive?.updatedAt!, 'PPP')}</span>
						</div>
						<span className='text-xs text-muted-foreground'>•</span>
						<div className='flex items-center gap-1'>
							<span className='font-semibold text-primary'>created:</span>
							<span>{format(renderActive?.createdAt!, 'PPP')}</span>
						</div>
					</div>
				</div>
				<Preview content={renderActive?.data.body} className='w-full' />
			</section>
		</article>
	)
}
