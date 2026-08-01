import { base } from '@baseconfig/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'

export function Products() {
	const { data: lists } = useSuspenseQuery(
		base.find({
			collection: 'products'
		})
	)

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<article className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
				{lists.docs.map((item) => {
					const { title, slug, data } = item
					return (
						<article className='border rounded-md' key={item.id}>
							<h2>{title}</h2>
							<p>{slug}</p>
						</article>
					)
				})}
			</article>
		</Suspense>
	)
}
