import { bannerBlock } from './Banner'
import { codeBlock } from './Code'
import { ctaBlock } from './Cta'
import { gridBlock } from './Grid'
import { mediaBlock } from './Media'
import { relatedPostsBlock } from './RelatedPosts'
import { richTextBlock } from './RichText'
import type { BlockConfig } from './shared/types'

/**
 * A live, runtime registry rather than the closed `Record<BlockSlug, BlockConfig>`
 * this used to be: mirrors `collections/registry.ts`'s own
 * `collectionsBySlug`/`globalsBySlug` pattern, for the same reason: a
 * plugin package (e.g. `@baseconfig/plugin-form-builder`) can't add a member to a
 * union type it doesn't own, so this needs to be something it can register
 * *into* instead. Seeded with this package's own 7 built-in blocks eagerly
 * (unlike `collectionsBySlug`, which starts empty, these aren't optional,
 * a consumer gets them "for free" with zero registration, same as before
 * this file existed); `registerBlocks()` merges more in on top. `columns`
 * used to be an eighth entry here, deleted, its role absorbed by `grid`
 * (see that block's own doc comment).
 */
export const blocksBySlug: Record<string, BlockConfig> = {
	richtext: richTextBlock,
	media: mediaBlock,
	cta: ctaBlock,
	banner: bannerBlock,
	grid: gridBlock,
	code: codeBlock,
	relatedPosts: relatedPostsBlock
}

/** Called once by `baseConfig()` with `config.blocks ?? []`, see that function's own doc comment. A slug collision (a plugin registering a slug this package already uses) silently overwrites the built-in, matching how `collectionsBySlug`/`globalsBySlug` already resolve collisions (last write wins, no error); not guarded further since block slugs are far less likely to collide than collection slugs. */
export function registerBlocks(blocks: BlockConfig[]) {
	for (const block of blocks) {
		blocksBySlug[block.slug] = block
	}
}
