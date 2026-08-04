import { DefaultLoader } from '@/components/bounderies/default-loader'
import { base } from '@baseconfig/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/(frontend)/(pages)/docs/$')({
	component: RouteComponent
})

function RouteComponent() {
	const { data: docLists } = useSuspenseQuery(
		base.find({
			collection: 'docs'
		})
	)

	return (
		<article className='flex flex-col gap-5 mx-auto'>
			<Suspense fallback={<DefaultLoader />}>
				<h1>Docs</h1>
				<pre className='text-sm'>{JSON.stringify(docLists?.docs, null, 2)}</pre>
			</Suspense>
		</article>
	)
}
