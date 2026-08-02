import { cn } from '@/lib/cn'
import { getBaseURL } from '@/lib/getURL'
import { type TypedDocumentRow } from '@baseconfig/core'
import { Badge } from '@baseconfig/ui/components/badge'
import { Link } from '@tanstack/react-router'
import { Suspense } from 'react'

type ProductsProps = {
	initialData: TypedDocumentRow<'products'>[]
}

export function Products({ initialData }: ProductsProps) {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<article className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
				{initialData.map((item, index) => {
					const { id, data } = item
					return (
						<Link
							to='/shop/$id'
							params={{
								id: id
							}}
							className={cn('relative group/products')}
							key={`${index}-${id}`}
						>
							{data.metadata?.image && (
								<img
									alt={data.metadata?.image.name ?? 'alt'}
									src={`${getBaseURL()}${data.metadata?.image?.url}?w=400`}
									className={cn(
										'aspect-video w-full object-cover rounded-xs shadow-accent',
										'group-hover/products:scale-[105%] transition-transform',
										'duration-300 ease-in-out shadow'
									)}
								/>
							)}
							<div className='pt-1'>
								<h2 className={cn('text-base w-fit', 'line-clamp-1')}>
									{data.metadata?.title}
								</h2>
								<p className='text-xs bg-accent w-fit'>
									{`$${data.product?.price}.00`} USD
								</p>
								<p className='text-xs line-clamp-3'>
									{data.metadata?.description}
								</p>
							</div>
							<div className='absolute top-2 right-2'>
								{data.product?.stock ? (
									<Badge
										variant={
											data.product?.stock < 10 && data.product?.stock > 0
												? 'secondary'
												: 'default'
										}
										className='text-[8px]!'
									>
										{data.product?.stock < 10 && data.product?.stock > 0
											? 'Low Stock'
											: 'In Stock'}
									</Badge>
								) : null}
							</div>
						</Link>
					)
				})}
			</article>
		</Suspense>
	)
}
