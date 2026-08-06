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
		if (
			_splat.match(
				/\.(png|jpg|jpeg|gif|webp|avif|svg|ico|txt|json|xml|md|css|js|ts|tsx|html|map)$/i
			) ||
			_splat.includes('/well-known') ||
			_splat.includes('/api') ||
			_splat.includes('/admin')
		) {
			return { page: null }
		}
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
	head: ({ loaderData }) => {
		if (!loaderData)
			return {
				title: 'Page not found',
				meta: [
					{ property: 'og:title', content: 'Page not found' },
					{ name: 'twitter:title', content: 'Page not found' },
					{ property: 'og:type', content: 'website' },
					{
						property: 'og:url',
						content: `${import.meta.env.VITE_ORIGIN}/404`
					},
					{ property: 'og:site_name', content: 'Baseconfig' },
					{ name: 'twitter:card', content: 'summary_large_image' }
				]
			}
		const meta = loaderData?.page?.data?.metadata
		return {
			meta: [
				...(meta?.title ? [{ title: meta?.title }] : []),
				...(meta?.description ? [{ description: meta?.description }] : []),
				...(meta?.image?.url ? [{ image: meta?.image?.url }] : []),
				...(meta?.title
					? [
							{ property: 'og:title', content: meta?.title },
							{ name: 'twitter:title', content: meta?.title }
						]
					: []),
				...(meta?.description
					? [
							{ property: 'og:description', content: meta?.description },
							{ name: 'twitter:description', content: meta?.description }
						]
					: []),
				...(meta?.image?.url
					? [{ property: 'og:image', content: meta?.image?.url }]
					: []),
				{ property: 'og:type', content: 'website' },
				{
					property: 'og:url',
					content: `${import.meta.env.VITE_ORIGIN}/${
						loaderData.page?.slug === 'home' ? '' : loaderData.page?.slug
					}`
				},
				{ property: 'og:site_name', content: 'Baseconfig' },
				{ name: 'twitter:card', content: 'summary_large_image' },
				{
					rel: 'canonical',
					href: `${import.meta.env.VITE_ORIGIN}/${loaderData.page?.slug === 'home' ? '' : loaderData.page?.slug}`
				}
			]
		}
	},
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
