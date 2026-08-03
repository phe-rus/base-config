import { cn } from '@/lib/cn'
import { getBaseURL } from '@/lib/getURL'
import { base } from '@baseconfig/core'
import { Preview } from '@baseconfig/ui/basiccn'
import { Button } from '@baseconfig/ui/components/button'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@baseconfig/ui/components/tabs'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/(frontend)/shop/$id')({
	loader: async ({ context, params }) => {
		const products = await context.query.ensureQueryData(
			base.findByID({
				collection: 'products',
				id: params.id
			})
		)
		return { products }
	},
	component: RouteComponent
})

function RouteComponent() {
	const [count, setCount] = useState(1)
	const { products } = Route.useLoaderData()
	const location = useLocation()

	const handleAddToCart = () => {
		setCount(count + 1)
	}

	const breadcrumbs = () => {
		const href = location.href
		const arr = href.split('/').filter(Boolean)
		let path = ''

		return (
			<div
				className={cn(
					'flex items-center gap-px leading-tight',
					'text-sm! lowercase font-light!'
				)}
			>
				{arr.map((s, i) => {
					path += `/${s}`
					const breadcrumb = s.charAt(0).toUpperCase() + s.slice(1)
					const isLast = i === arr.length - 1

					if (isLast) {
						return (
							<p key={path} className='text-muted-foreground'>
								{breadcrumb}
							</p>
						)
					}

					return (
						<div key={path} className='flex items-center'>
							<Link to={path} className='font-bold!'>
								<p>{breadcrumb}</p>
							</Link>
							<span className='px-1'>/</span>
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<article className='flex flex-col gap-5 py-10 mx-auto'>
			<section
				className={cn(
					'container grid grid-cols-12',
					'gap-5 w-full md:max-w-3xl'
				)}
			>
				<div className='col-span-12'>{breadcrumbs()}</div>
				<div className='col-span-12 md:col-span-5'>
					{products.data?.metadata?.image && (
						<img
							src={`${getBaseURL()}${products?.data?.metadata?.image?.url}?w=400`}
							alt={products?.data?.metadata?.image.name ?? 'alt'}
							className={cn(
								'w-full aspect-auto object-cover rounded-none!',
								'hover:scale-105 transition-transform duration-500'
							)}
						/>
					)}
				</div>
				<div className='col-span-12 md:col-span-7'>
					<h1 className='text-4xl font-bold'>
						{products?.data?.metadata?.title}
					</h1>
					<p className='text-xl'>${products?.data?.product?.price}.00</p>
					<p>Stock: {products?.data?.product?.stock}</p>
					<p className='text-base text-muted-foreground'>
						{products?.data?.metadata?.description}
					</p>

					<div className='flex items-center gap-3 mt-5'>
						<div className='flex items-center gap-3'>
							<Button
								size='icon-sm'
								className='group rounded-full!'
								onClick={handleAddToCart}
							>
								<IconPlus />
							</Button>
							<p className='text-sm font-semibold'>{count}</p>
							<Button
								size='icon-sm'
								variant='destructive'
								className='group rounded-full!'
								onClick={() => setCount(count - 1)}
							>
								<IconMinus />
							</Button>
						</div>

						<Button size='sm' className='rounded-full'>
							Add to Cart
						</Button>
					</div>
				</div>
			</section>

			<section
				className={cn('container flex flex-col', 'gap-5 w-full md:max-w-3xl')}
			>
				<Tabs defaultValue='details'>
					<TabsList variant='line' className='px-0! gap-3'>
						<TabsTrigger value='details' className='text-base! px-0!'>
							Details
						</TabsTrigger>
					</TabsList>
					<TabsContent value='details'>
						<Preview
							content={products?.data?.product?.description}
							className='md:max-w-lg'
						/>
					</TabsContent>
				</Tabs>
			</section>
		</article>
	)
}
