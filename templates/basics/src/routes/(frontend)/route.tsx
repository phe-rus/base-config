import { cn } from '@/lib/cn'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<>
			<header
				className={cn(
					'sticky top-0 flex items-center justify-between z-55',
					'border-b border-border/35 bg-input/35 backdrop-blur-sm'
				)}
			>
				<section className='flex items-center py-2 justify-between w-full container md:max-w-6xl'>
					<span className='font-bold'>basics</span>
					<Link to='/admin'>Admin</Link>
				</section>
			</header>
			<Outlet />
		</>
	)
}
