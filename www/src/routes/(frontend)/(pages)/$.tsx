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
	beforeLoad: async ({ context, params: { _splat } }) => {
		const pageLists = await context.query.ensureQueryData(
			base.find({
				collection: 'pages',
				where: {
					slug: { equals: _splat }
				}
			})
		)
		const page = pageLists.docs[0]
		if (!page) {
			return {
				page: null
			}
		}
		return {
			page
		}
	},
	loader: ({ context }) => ({
		page: context.page
	}),
	component: RouteComponent
})

function RouteComponent() {
	const { _splat } = Route.useParams()
	const { page: pageLoader } = Route.useLoaderData()

	if (!pageLoader) {
		return (
			<article className='container flex flex-col my-auto mx-auto'>
				<h1 className='text-3xl font-bold'>Page not found</h1>
				<p>
					The page <code>/{_splat}</code> does not exist.
				</p>
			</article>
		)
	}

	const { data: page } = useSuspenseQuery({
		initialData: pageLoader ?? undefined,
		...base.findByID({
			collection: 'pages',
			id: pageLoader?.id ?? ''
		})
	})

	return (
		<article className='flex flex-col gap-5 mx-auto'>
			<Suspense fallback={<DefaultLoader />}>
				<Renderer data={page.data} />
			</Suspense>
		</article>
	)
}
