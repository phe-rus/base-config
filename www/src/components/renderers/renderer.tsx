import type { Pages } from '@/config/base.types'
import { RenderBlocks } from '@/config/blocks'
import type { FC } from 'react'
import { RenderHero } from './render-hero'

type rendererProps = {
	data: Pages
}
export const Renderer: FC<rendererProps> = ({ data }) => {
	return (
		<article className='flex flex-col'>
			<RenderHero data={data.hero} />
			<div className='container flex flex-col gap-5 mx-auto md:max-w-3xl'>
				<RenderBlocks blocks={data?.content} />
			</div>
		</article>
	)
}
