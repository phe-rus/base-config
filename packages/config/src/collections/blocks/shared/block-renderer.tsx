import { blocksBySlug } from '../registry'

/** One raw stored block value, straight out of a document's own `data`: `blockType` picks which registered `BlockConfig` (and its optional `Render`) applies. */
export type BlockData = Record<string, unknown> & { blockType?: unknown }

/**
 * The public-facing counterpart to `BlocksField` (`../fields/BlocksField/index.tsx`):
 * dispatches a document's own stored `blocks` array through each block's
 * *registered* `Render` (see `BlockConfig['Render']`'s own doc comment),
 * exactly the same `blocksBySlug` registry the admin editor already reads.
 * A block with an unrecognized `blockType`, or a recognized one with no
 * `Render` yet, is silently skipped, never a crash, never a placeholder,
 * so a page keeps rendering the blocks that do have public markup while a
 * block's public half is still being built out. Index-keyed: safe here
 * specifically because this renders a fixed snapshot of already-published
 * document data for one request, never a live-reorderable list.
 */
export function BlockRenderer({ blocks }: { blocks: unknown }) {
	if (!Array.isArray(blocks)) return null
	return (
		<>
			{(blocks as BlockData[]).map((block, index) => {
				const slug =
					typeof block?.blockType === 'string' ? block.blockType : null
				const config = slug ? blocksBySlug[slug] : undefined
				const { Render } = config ?? {}
				if (!Render) return null
				return <Render key={index} data={block} />
			})}
		</>
	)
}
