import { Products } from '@/components/products'
import { cn } from '@/lib/cn'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from '@baseconfig/ui/components/input-group'
import { IconSearch } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/(frontend)/shop/')({
	component: RouteComponent
})

function RouteComponent() {
	const [search, setSearch] = useState<string | undefined>('')
	const { lists } = Route.useRouteContext()

	const filterProducts = useMemo(() => {
		if (!search) return lists.docs
		return lists.docs.filter(
			(l) =>
				l?.title?.toLowerCase().includes(search) ||
				l?.data.metadata?.description?.toLowerCase().includes(search) ||
				l.data.metadata?.keywords?.some((k) =>
					k.toLowerCase().includes(search)
				) ||
				l.data.product?.price?.toString().includes(search)
		)
	}, [search, lists])

	return (
		<article className='flex flex-col gap-5 py-10 mx-auto'>
			<section
				className={cn(
					'container flex items-center',
					'gap-5 w-full md:max-w-3xl'
				)}
			>
				<InputGroup
					className={cn(
						'w-full md:max-w-sm mr-auto rounded-none ring-0! bg-card',
						'has-[[data-slot=input-group-control]:focus-visible]:border-border'
					)}
				>
					<InputGroupInput
						placeholder='Search'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<InputGroupAddon>
						<InputGroupButton size='icon-xs' className='rounded-full!'>
							<IconSearch />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</section>
			<section className='container flex flex-col gap-5 w-full md:max-w-3xl'>
				<Products initialData={filterProducts} />
			</section>
		</article>
	)
}
