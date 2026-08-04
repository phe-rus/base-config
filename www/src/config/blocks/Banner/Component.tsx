import type { LinkItemValue, UploadValue } from '@baseconfig/core'
import type { BasiccnContent } from '@baseconfig/ui/basiccn'
import { Preview } from '@baseconfig/ui/basiccn/preview'
import { buttonVariants } from '@baseconfig/ui/components/button'
import type { FC } from 'react'

/** Full-width banner: optional background image, copy, and buttons stacked in a column. */
export const BannerBlock: FC<{
	content?: BasiccnContent
	image?: UploadValue
	links?: LinkItemValue[]
}> = ({ content, image, links }) => {
	if (!content && !image && !links?.length) return null
	return (
		<section className='flex flex-col items-center gap-4 py-12 text-center'>
			{image ? (
				<img
					src={image.url}
					alt={image.name ?? ''}
					className='max-h-64 w-full rounded-lg object-cover'
				/>
			) : null}
			{content ? <Preview content={content} /> : null}
			{links?.length ? (
				<div className='flex flex-wrap items-center justify-center gap-3'>
					{links.map((link, index) =>
						link.label && link.to ? (
							<a
								key={index}
								href={link.to}
								target={link.openInNewTab ? '_blank' : undefined}
								rel={link.openInNewTab ? 'noreferrer' : undefined}
								className={buttonVariants({
									size: 'lg',
									variant: link.appearance
								})}
							>
								{link.label}
							</a>
						) : null
					)}
				</div>
			) : null}
		</section>
	)
}
