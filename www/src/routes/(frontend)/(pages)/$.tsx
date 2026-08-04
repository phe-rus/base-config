import { DefaultLoader } from '@/components/bounderies/default-loader'
import { Renderer } from '@/components/renderers'
import { base } from '@baseconfig/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/(frontend)/(pages)/$')({
	params: {
		parse: ({ _splat = 'home' }) => {
			return {
				_splat: _splat || 'home'
			}
		}
	},
	component: RouteComponent
})

function RouteComponent() {
	const { _splat } = Route.useParams()
	const { data: pageLists } = useSuspenseQuery(
		base.find({
			collection: 'pages',
			where: {
				slug: { equals: _splat }
			}
		})
	)

	const page = pageLists.docs[0]

	if (!page) {
		return (
			<article className='flex flex-col gap-5 mx-auto'>
				<h1 className='text-3xl font-bold'>Page not found</h1>
				<p>
					The page <code>/{_splat}</code> does not exist.
				</p>
			</article>
		)
	}

	return (
		<article className='flex flex-col gap-5 mx-auto'>
			<Suspense fallback={<DefaultLoader />}>
				<Renderer data={page.data} />
			</Suspense>
		</article>
	)
}
