import { cn } from '@/lib/cn'
import type { ContentBlock } from '@/config/base.types'
import type { FC } from 'react'
import { RenderBlock } from '../RenderBlocks'

/**
 * A grid is just blocks inside blocks, so each item goes back through the
 * same `RenderBlock` dispatcher. The `RenderBlocks`/`Grid/Component` import
 * cycle is safe for the same reason the library's own lazy-schema cycle is:
 * `RenderBlock` is only ever read at render time, inside this component
 * body, never at module-eval.
 */
export const GridBlock: FC<{
	variant?: string
	items?: ContentBlock[]
}> = ({ variant, items }) => {
	const resolved =
		variant === 'card' || variant === 'bordered' ? variant : 'default'
	if (!items?.length) return null
	return (
		<div className='grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 md:grid-cols-3'>
			{items.map((item, index) => (
				<div
					key={index}
					className={cn(
						resolved === 'card' && 'rounded-lg bg-card p-4 shadow-sm',
						resolved === 'bordered' && 'rounded-lg border p-4'
					)}
				>
					<RenderBlock block={item} />
				</div>
			))}
		</div>
	)
}
