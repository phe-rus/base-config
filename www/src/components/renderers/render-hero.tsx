import type { Pages } from '@/config/base.types'
import { cn } from '@/lib/cn'
import { Preview } from '@baseconfig/ui/basiccn'
import { buttonVariants } from '@baseconfig/ui/components/button'
import { Link } from '@tanstack/react-router'
import type { FC } from 'react'

type rendererHeroProps = {
	data: Pages['hero']
}

export const RenderHero: FC<rendererHeroProps> = ({ data }) => {
	if (!data) return null
	return (
		<article
			className={cn(
				'relative -mt-10 flex items-center justify-center',
				'overflow-hidden typeset-img:m-0 typeset-img:rounded-none'
			)}
		>
			<section className='absolute z-10 w-full'>
				<div
					className={cn(
						'container flex flex-col gap-5 mx-auto',
						'typeset-img:px-0 typeset-img:rounded-none',
						'md:max-w-3xl'
					)}
				>
					<Preview content={data?.content} />
					{data?.links ? (
						<div className='md:max-w-md mx-auto'>
							{data.links.map((link, idx) => (
								<Link
									key={idx}
									to={link.href}
									className={cn(
										buttonVariants({
											size: 'lg',
											variant: 'secondary'
										})
									)}
								>
									{link.label}
								</Link>
							))}
						</div>
					) : (
						<></>
					)}
				</div>
			</section>
			<div className='min-h-[70vh] max-h-[70vh] w-full select-none'>
				{data?.image && (
					<img
						src={data.image.url}
						alt={data.image.name}
						className={cn(
							'-z-10 object-cover aspect-auto',
							'w-full object-cover opacity-20'
						)}
					/>
				)}
				<div
					className={cn(
						'absolute pointer-events-none left-0 -bottom-1',
						'w-full h-1/2 bg-linear-to-t from-background to-transparent'
					)}
				/>
			</div>
		</article>
	)
}
