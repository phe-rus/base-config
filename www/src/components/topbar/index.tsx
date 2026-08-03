import { cn } from '@/lib/cn'
import { base } from '@baseconfig/core'
import { buttonVariants } from '@baseconfig/ui/components/button'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

export const Topbar = () => {
	const { data: items } = useSuspenseQuery(base.findGlobal({ slug: 'topbar' }))

	return (
		<header
			className={cn(
				'sticky top-0 flex items-center justify-between z-55',
				'border-b border-border/35 bg-input/35 backdrop-blur-sm'
			)}
		>
			<section
				className={cn('px-5 flex items-center h-10 justify-between', 'w-full')}
			>
				<div className='flex items-center gap-5'>
					<span className='font-bold'>basics</span>
					<nav className='flex items-center gap-3 text-sm!'>
						{items?.data.items?.map((items, index) => {
							const isTo = items.to?.includes('home') ? '/' : items.to
							return (
								<Link key={index} to={isTo as any}>
									{items.label}
								</Link>
							)
						})}
					</nav>
				</div>
				<nav className='flex items-center gap-1'>
					<Link
						to='/admin'
						className={cn(
							buttonVariants({
								size: 'sm',
								variant: 'secondary'
							})
						)}
					>
						Admin
					</Link>
				</nav>
			</section>
		</header>
	)
}
