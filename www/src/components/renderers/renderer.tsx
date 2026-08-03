import type { Pages } from '@/config/base.types'
import type { FC } from 'react'
import { RenderHero } from './render-hero'

type rendererProps = {
	data: Pages
}
export const Renderer: FC<rendererProps> = ({ data }) => {
	return (
		<article className='flex flex-col'>
			<RenderHero data={data.hero} />
			<div className='content-section container mx-auto'>
				{data?.content?.map((block, idx) => (
					<pre key={idx}>{JSON.stringify(block, null, 2)}</pre>
				))}
			</div>
		</article>
	)
}
