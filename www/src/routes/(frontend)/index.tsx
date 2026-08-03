import { cn } from '@/lib/cn'
import { buttonVariants } from '@baseconfig/ui/components/button'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<article className='flex flex-col gap-5 py-20 mx-auto'>
			<section className='container flex flex-col w-full md:max-w-2xl'>
				<h1 className='font-bold'>Baseconfig</h1>
				<p className='text-muted-foreground md:max-w-md'>
					A minimal reference app for <code>@baseconfig/core</code>. Sign in at{' '}
					<a href='/admin' className='underline underline-offset-2'>
						/admin
					</a>{' '}
					to try the cms the first account you create becomes an admin
					automatically.
				</p>

				<div className='flex items-center gap-5 mt-10'>
					<Link
						to='/admin'
						className={cn(
							'text-olive-300 hover:text-olive-400 hover:underline',
							'text-xl font-bold transition-all duration-200 hover:scale-105',
							'underline-offset-10 decoration-wavy'
						)}
					>
						Get started
					</Link>

					<Link
						to='/admin'
						className={cn(
							'text-olive-300 hover:text-olive-400 underline-offset-10',
							'text-xl font-bold transition-all duration-200 hover:scale-105',
							'decoration-wavy bg-input/35 px-5 py-2 rounded-xl'
						)}
					>
						Learn more
					</Link>
				</div>
			</section>

			<section className='container flex flex-col gap-5 w-full md:max-w-2xl'>
				<h3 className='md:max-w-sm text-muted-foreground'>
					Using Baseconfig to build anything. Or everything.
				</h3>
				<ul className='flex flex-col gap-2'>
					<li
						className={cn(
							'text-4xl font-bold cursor-pointer',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]',
							buttonVariants({})
						)}
					>
						Headless eCommerce
					</li>
					<li
						className={cn(
							'text-3xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Enterprise App Builder
					</li>
					<li
						className={cn(
							'text-2xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Digital Asset Management
					</li>
					<li
						className={cn(
							'text-3xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Enterprise App Builder
					</li>
					<li
						className={cn(
							'text-2xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Digital Asset Management
					</li>
					<li
						className={cn(
							'text-3xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Enterprise App Builder
					</li>
					<li
						className={cn(
							'text-2xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Digital Asset Management
					</li>
					<li
						className={cn(
							'text-3xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Enterprise App Builder
					</li>
					<li
						className={cn(
							'text-2xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Digital Asset Management
					</li>
					<li
						className={cn(
							'text-3xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Enterprise App Builder
					</li>
					<li
						className={cn(
							'text-2xl font-bold cursor-pointer text-olive-400/85',
							'hover:underline underline-offset-10 decoration-wavy',
							'hover:text-olive-400 transition-all duration-200 hover:scale-[102%]'
						)}
					>
						Digital Asset Management
					</li>
				</ul>
			</section>
		</article>
	)
}
