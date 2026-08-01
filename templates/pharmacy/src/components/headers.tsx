import { cn } from '@/lib/cn'
import { Button } from '@baseconfig/ui/components/button'
import { IconShoppingBag, IconUser } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'

export const Headers = () => {
	return (
		<header
			className={cn('sticky top-0 border-b border-border/35', 'bg-background')}
		>
			<section
				className={cn(
					'container flex items-center justify-between w-full',
					'h-10'
				)}
			>
				<div className='flex items-center'>
					<h2>{`What are we building today?`}</h2>
				</div>

				<nav className='flex items-center gap-2'>
					<Link to='/'>Shop</Link>
					<Button size='icon-sm' variant='secondary' className='rounded-full'>
						<IconUser />
					</Button>
					<Button size='icon-sm' variant='secondary' className='rounded-full'>
						<IconShoppingBag />
					</Button>
				</nav>
			</section>
		</header>
	)
}
