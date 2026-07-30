import { IconNews } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { base } from '../../db/content-client'
import { RelationGroupFields } from '../fields/relations-field'
import { collectionsBySlug } from '../registry'
import { collectionPath } from '../types'
import type { BlockConfig, BlockFieldsProps } from './types'

export const relatedPostsBlockSchema = z.object({
	blockType: z.literal('relatedPosts'),
	label: z.string().optional(),
	mode: z.enum(['manual', 'keyword']).optional(),
	ids: z.array(z.object({ id: z.string() })).optional(),
	keywords: z.array(z.string()).optional()
})

function RelatedPostsBlockFields({ form, path }: BlockFieldsProps) {
	return <RelationGroupFields form={form} path={path} />
}

/**
 * Shared by the block itself (`relatedPostsBlock.Render` below) *and* a
 * `relations`-type field's own top-level value directly (see `posts.ts`'s
 * own `relations` tab) — both are one group of the exact same shape
 * (`{label?, mode?, ids?, keywords?}`), so a public article route renders
 * a document's own `data.relations` groups through this same component
 * rather than a second, parallel implementation.
 *
 * **Fetches every published post, unfiltered, then filters client-side** —
 * `base.find()`'s own `where` only supports top-level `status`/`slug`
 * (see `WhereCondition`'s own doc comment, `db/content-queries.ts`), so
 * keyword-mode filtering (which reaches into a post's own `data.metadata.keywords`)
 * has no server-side query to lean on yet; this is the same disclosed gap
 * as `join` (see the root `CLAUDE.md`'s "Not done yet"), worked around
 * here the same way rather than blocked on it.
 */
export function RelatedPostsGroupRender({
	data
}: {
	data: Record<string, unknown>
}) {
	const label = typeof data.label === 'string' ? data.label : undefined
	const mode = data.mode === 'keyword' ? 'keyword' : 'manual'
	const ids = Array.isArray(data.ids)
		? (data.ids as { id?: unknown }[])
				.map((entry) => entry?.id)
				.filter((id): id is string => typeof id === 'string')
		: []
	const keywords = Array.isArray(data.keywords)
		? (data.keywords as unknown[]).filter(
				(keyword): keyword is string => typeof keyword === 'string'
			)
		: []

	const { data: result } = useQuery(base.find({ collection: 'posts' }))
	const posts = result?.docs ?? []

	const related =
		mode === 'keyword'
			? keywords.length === 0
				? []
				: posts.filter((post) => {
						const postKeywords = (
							post.data as { metadata?: { keywords?: unknown } } | undefined
						)?.metadata?.keywords
						return (
							Array.isArray(postKeywords) &&
							postKeywords.some((keyword) =>
								keywords.includes(keyword as string)
							)
						)
					})
			: ids.length === 0
				? []
				: posts.filter((post) => ids.includes(post.id))

	if (related.length === 0) return null

	const postsConfig = collectionsBySlug.posts

	return (
		<section className='flex flex-col gap-4 py-8'>
			{label ? <h3>{label}</h3> : null}
			<div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3'>
				{related.map((post) => (
					<a
						key={post.id}
						href={
							postsConfig ? collectionPath(postsConfig, post.slug ?? '') : '#'
						}
						className='flex flex-col gap-1 rounded-md border p-4 transition-colors hover:bg-input/20'
					>
						{post.title || 'Untitled'}
					</a>
				))}
			</div>
		</section>
	)
}

export const relatedPostsBlock: BlockConfig = {
	slug: 'relatedPosts',
	label: 'Related posts',
	schema: relatedPostsBlockSchema,
	defaultValue: { label: undefined, mode: 'manual', ids: [], keywords: [] },
	Fields: RelatedPostsBlockFields,
	Render: RelatedPostsGroupRender,
	Icon: IconNews
}
