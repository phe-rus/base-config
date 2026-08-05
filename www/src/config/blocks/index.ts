import { bannerBlock } from './Banner/config'
import { codeBlock } from './Code/config'
import { ctaBlock } from './Cta/config'
import { gridBlock } from './Grid/config'
import { mediaBlock } from './Media/config'
import { relatedPostsBlock } from './RelatedPosts/config'
import { richTextBlock } from './RichText/config'
import { RenderBlock, RenderBlocks } from './RenderBlocks'

/**
 * www's own block tree, Payload-style: every block lives in
 * `src/config/blocks/<Name>/` as a `config.ts` (the `defineBlock` call, the
 * library's job) plus a `Component.tsx` (www's own public markup, used by
 * `RenderBlocks`, never the library's). The admin authoring half is derived
 * by `defineBlock` from each block's `fields`; only a genuinely custom
 * editor (here: `Code`) keeps a `Fields.tsx`. The `blocks`
 * array is what `base.config.ts` registers via `baseConfig({blocks})`,
 * which is what makes each block appear in the admin picker and in the
 * generated `ContentBlock` union. Add a new block by adding a folder here
 * and one entry to this array; nothing in the library changes.
 */
export const blocks = [
	richTextBlock,
	mediaBlock,
	ctaBlock,
	bannerBlock,
	gridBlock,
	codeBlock,
	relatedPostsBlock
]

export { RenderBlock, RenderBlocks }
