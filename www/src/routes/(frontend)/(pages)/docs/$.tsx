import { DefaultLoader } from '@/components/bounderies/default-loader'
import { cn } from '@/lib/cn'
import { base } from '@baseconfig/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense, useMemo } from 'react'

export const Route = createFileRoute('/(frontend)/(pages)/docs/$')({
	component: RouteComponent
})

function RouteComponent() {
	const { _splat } = Route.useParams()
	const { data: docLists } = useSuspenseQuery(
		base.find({
			collection: 'docs'
		})
	)

	const sidebar = useMemo(() => {
		return docLists?.docs.map((doc) => {
			return {
				label: doc.title,
				href: `/docs/${doc.slug}`
			}
		})
	}, [docLists])

	return (
		<Suspense fallback={<DefaultLoader />}>
			<article className='relative container flex'>
				<aside
					className={cn(
						'flex flex-col text-nowrap!',
						'sticky top-10 py-5 h-[calc(100vh-100px)]'
					)}
				>
					<nav className='flex flex-col gap-2'>
						{sidebar?.map((item, idx) => (
							<Link key={idx} to={item.href}>
								{item.label}
							</Link>
						))}
					</nav>
				</aside>

				<section
					className={cn(
						'flex flex-col grow mx-auto border border-border',
						'md:max-w-2xl pb-10'
					)}
				>
					<h1>Docs</h1>
					<h2>{_splat}</h2>

					<pre className='text-sm'>
						{JSON.stringify(docLists?.docs, null, 2)}
					</pre>
				</section>
			</article>
		</Suspense>
	)
}
