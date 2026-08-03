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
						'typeset-img:px-0 typeset-img:rounded-none'
					)}
				>
					<Preview content={data?.content} />
					<div className='md:max-w-md mx-auto'>
						{data?.links &&
							data.links.map((link, idx) => (
								<Link
									key={idx}
									to={link.href}
									className={cn(
										buttonVariants({
											size: 'lg',
											variant: 'secondary',
											className: 'rounded-none! p-5!'
										})
									)}
								>
									{link.label}
								</Link>
							))}
					</div>
				</div>
			</section>
			<div className='min-h-[75vh] select-none'>
				{data?.image && (
					<img
						src={data.image.url}
						alt={data.image.name}
						className='-z-10 object-cover opacity-35 aspect-auto'
					/>
				)}
				<div
					className={cn(
						'absolute pointer-events-none left-0 -bottom-2',
						'w-full h-2/1 bg-linear-to-t from-background to-transparent'
					)}
				/>
			</div>
		</article>
	)
}
