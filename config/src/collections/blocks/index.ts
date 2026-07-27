import { z } from 'zod'
import { bannerBlock, bannerBlockSchema } from './banner'
import { columnsBlock, columnsBlockSchema } from './columns'
import { ctaBlock, ctaBlockSchema } from './cta'
import { gridBlock, gridBlockSchema } from './grid'
import { mediaBlock, mediaBlockSchema } from './media'
import { relatedPostsBlock, relatedPostsBlockSchema } from './related-posts'
import { richTextBlock, richTextBlockSchema } from './richtext'
import type { BlockConfig, BlockSlug } from './types'

export const blockRegistry: Record<BlockSlug, BlockConfig> = {
	richtext: richTextBlock,
	media: mediaBlock,
	cta: ctaBlock,
	banner: bannerBlock,
	grid: gridBlock,
	columns: columnsBlock,
	relatedPosts: relatedPostsBlock
}

export const blocksSchema = z.array(
	z.discriminatedUnion('blockType', [
		richTextBlockSchema,
		mediaBlockSchema,
		ctaBlockSchema,
		bannerBlockSchema,
		gridBlockSchema,
		columnsBlockSchema,
		relatedPostsBlockSchema
	])
)

export type { BlockConfig, BlockFieldsProps, BlockSlug } from './types'
