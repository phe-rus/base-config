import type { LinkItemValue } from '@baseconfig/core'
import type { BasiccnContent } from '@baseconfig/ui/basiccn'
import { Preview } from '@baseconfig/ui/basiccn/preview'
import { buttonVariants } from '@baseconfig/ui/components/button'
import type { FC } from 'react'

/** Centered call-to-action: supporting copy plus one or more buttons. */
export const CtaBlock: FC<{
	content?: BasiccnContent
	links?: LinkItemValue[]
}> = ({ content, links }) => {
	if (!content && !links?.length) return null
	return (
		<section className='flex flex-col items-center gap-6 py-12 text-center'>
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
