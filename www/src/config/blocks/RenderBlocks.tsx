import type { ContentBlock } from '@/config/base.types'
import type { FC } from 'react'
import { BannerBlock } from './Banner/Component'
import { CodeBlock } from './Code/Component'
import { CtaBlock } from './Cta/Component'
import { GridBlock } from './Grid/Component'
import { MediaBlock } from './Media/Component'
import { RelatedPostsBlock } from './RelatedPosts/Component'
import { RichTextBlock } from './RichText/Component'

/**
 * Mirrors Payload's website-template `RenderBlocks`
 * (payloadcms/payload, `templates/website/src/blocks/RenderBlocks.tsx`):
 * a plain `blockComponents` record keyed by `blockType`, then one loop that
 * looks each stored block up, guards the lookup, and renders the block's
 * own component with the block's fields spread through. A new block is one
 * folder in `config/blocks` plus one entry in this record, nothing in the
 * library changes. A stored `blockType` with no entry here (legacy data, a
 * plugin block www hasn't opted into) renders nothing, it can't break the
 * page.
 */
const blockComponents = {
	richtext: RichTextBlock,
	media: MediaBlock,
	cta: CtaBlock,
	banner: BannerBlock,
	grid: GridBlock,
	code: CodeBlock,
	relatedPosts: RelatedPostsBlock
}

/** One block through the map above, the single-block counterpart `Grid/Component` uses for its per-cell dispatch (Payload renders arrays only; a grid cell is itself one block). */
export const RenderBlock: FC<{ block: ContentBlock }> = ({ block }) => {
	const { blockType } = block
	if (blockType && blockType in blockComponents) {
		const Block = blockComponents[blockType]
		if (Block) {
			// The generated `ContentBlock` union is exhaustive over the map's
			// own keys, so each component's props (the block's own fields) line
			// up with the stored block's shape, Payload's `<Block {...block} />`.
			return <Block {...block} />
		}
	}
	return null
}

/**
 * Renders a document's stored `content` block array, Payload's `hasBlocks`
 * guard and per-block wrapper shape. Index-keyed: this renders a fixed
 * snapshot of already-published data for one request, never a
 * live-reorderable list.
 */
export const RenderBlocks: FC<{ blocks?: ContentBlock[] }> = ({ blocks }) => {
	const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

	if (hasBlocks) {
		return (
			<>
				{blocks.map((block, index) => {
					const { blockType } = block
					if (blockType && blockType in blockComponents) {
						const Block = blockComponents[blockType]
						if (Block) {
							return (
								<div key={index}>
									<Block {...block} />
								</div>
							)
						}
					}
					return null
				})}
			</>
		)
	}

	return null
}
