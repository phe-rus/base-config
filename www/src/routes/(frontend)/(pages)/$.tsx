import { Renderer } from '@/components/renderers'
import { base } from '@baseconfig/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/(pages)/$')({
	params: {
		parse: ({ _splat = 'home' }) => {
			return {
				_splat: _splat.includes('') ? 'home' : _splat
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

	return (
		<article className='flex flex-col gap-5 mx-auto'>
			<Renderer data={pageLists.docs[0].data} />
		</article>
	)
}
