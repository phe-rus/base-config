import { cn } from '@/lib/cn'
import { base } from '@baseconfig/core'
import { buttonVariants } from '@baseconfig/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@baseconfig/ui/components/popover'
import { IconGitFork, IconMenu3 } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Topbar = () => {
	const { data: items } = useSuspenseQuery(base.findGlobal({ slug: 'topbar' }))
	const [open, setOpen] = useState<boolean>(false)

	return (
		<header
			className={cn(
				'sticky top-0 flex items-center justify-between z-55',
				'backdrop-blur'
			)}
		>
			<section
				className={cn(
					'container flex items-center h-10 justify-between',
					'w-full'
				)}
			>
				<div className='flex items-center gap-5 truncate!'>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger
							className={cn(
								buttonVariants({
									size: 'icon-sm',
									className: 'rounded-full! flex md:hidden'
								})
							)}
							onClick={() => setOpen((prev) => !prev)}
						>
							<IconMenu3 />
						</PopoverTrigger>
						<PopoverContent
							align='start'
							className={cn(
								'flex flex-col mt-2 z-60!',
								'bg-background! min-w-full!',
								'gap-0.5! border-border/15!'
							)}
						>
							{items?.data.items?.map((items, index) => {
								const isTo = items.to?.includes('home') ? '/' : items.to
								return (
									<Link
										key={index}
										to={isTo as any}
										className='text-lg!'
										activeProps={{
											className: cn(
												'underline decoration-wavy! decoration-primary!',
												'text-primary!'
											)
										}}
										onClick={() => setOpen((prev) => !prev)}
									>
										{items.label}
									</Link>
								)
							})}
						</PopoverContent>
					</Popover>
					<Link to={'/' as any} className='font-bold text-primary'>
						Baseconfig
					</Link>

					{items ? (
						<nav className='hidden md:flex items-center gap-3 text-sm!'>
							{items.data.items?.map((items, index) => {
								const isTo = items.to?.includes('home') ? '/' : items.to
								return (
									<Link
										key={index}
										to={isTo as any}
										activeProps={{
											className: cn(
												'underline decoration-wavy! decoration-primary!',
												'text-primary!'
											)
										}}
									>
										{items.label}
									</Link>
								)
							})}
						</nav>
					) : null}
				</div>
				<nav className='flex items-center gap-1'>
					<Link
						to='/$'
						params={{
							_splat: ''
						}}
						className='flex items-center gap-1'
					>
						<span
							className={buttonVariants({
								size: 'icon-sm',
								className: 'rounded-full!'
							})}
						>
							<IconGitFork />
						</span>
						<span className='text-xs px-1'>Github</span>
					</Link>
					<Link
						to='/admin'
						className={cn(
							buttonVariants({
								size: 'sm',
								className: 'rounded-full!'
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
