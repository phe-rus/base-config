import { cn } from '@/lib/cn'
import { Button } from '@baseconfig/ui/components/button'
import { IconShoppingBag, IconUser } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'

export const Headers = () => {
	return (
		<header
			className={cn(
				'sticky top-0 border-b border-border/35 z-55',
				'bg-background'
			)}
		>
			<section
				className={cn(
					'container flex items-center justify-between w-full',
					'h-10'
				)}
			>
				<div className='flex items-center'>
					<Link to='/'>Duis id turpis</Link>
				</div>

				<nav className='flex items-center gap-2'>
					<Link to='/shop' className='text-sm!'>
						Shop
					</Link>
					<Button
						size='icon-sm'
						className='rounded-full'
						render={<Link to='/admin' />}
					>
						<IconUser />
					</Button>
					<Button
						size='icon-sm'
						className='rounded-full'
						render={<Link to='/shop' />}
					>
						<IconShoppingBag />
					</Button>
				</nav>
			</section>
		</header>
	)
}
