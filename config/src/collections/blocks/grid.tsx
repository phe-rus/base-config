import { cn } from '@base/ui/lib/utils'
import { IconLayoutGrid } from '@tabler/icons-react'
import { z } from 'zod'
import { BlocksField } from '../fields/blocks-field'
import { blocksBySlug } from './registry'
import type { BlockConfig, BlockFieldsProps } from './types'

/**
 * Same lenient shape `columns` (now deleted — this block absorbed its
 * role, see `gridBlock`'s own doc comment) used for its own nested
 * blocks — validated loosely (just "has a `blockType`") rather than
 * against the full block union, to avoid a circular schema reference
 * back to `blocksSchema` (`./index.ts`).
 */
const looseBlock = z.object({ blockType: z.string() }).loose()

const gridVariantValues = ['default', 'card', 'bordered'] as const

export const gridBlockSchema = z.object({
	blockType: z.literal('grid'),
	variant: z.enum(gridVariantValues).optional(),
	items: z.array(looseBlock).optional()
})

function GridBlockFields({ form, path, uploadFolder, id }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.variant`}>
				{(f: any) => (
					<f.Select
						label='Layout'
						description='How each item is wrapped when this grid renders publicly.'
						defaultValue='default'
						options={[
							{ label: 'Default', value: 'default' },
							{ label: 'Card', value: 'card' },
							{ label: 'Bordered', value: 'bordered' }
						]}
					/>
				)}
			</form.AppField>
			<BlocksField
				form={form}
				name={`${path}.items`}
				label='Items'
				description='Any block goes here — each one lays out as one grid cell.'
				exclude={['grid']}
				uploadFolder={uploadFolder}
				id={id}
			/>
		</div>
	)
}

/**
 * `blocksBySlug` is imported from `./registry`, which itself imports
 * `gridBlock` (this file) to build that same registry — a real circular
 * import, safe here specifically because this function only ever reads
 * `blocksBySlug` at actual render time (inside the closure, never at this
 * module's own top-level evaluation), by which point `registry.ts` has
 * long finished assigning it. Same underlying tension `getBlocksSchema()`
 * (`./index.ts`) already resolves with `z.lazy()` — this is the render-side
 * equivalent of that same pattern.
 */
function GridBlockRender({ data }: { data: Record<string, unknown> }) {
	const variant =
		data.variant === 'card' || data.variant === 'bordered'
			? data.variant
			: 'default'
	const items = Array.isArray(data.items)
		? (data.items as Record<string, unknown>[])
		: []

	if (items.length === 0) return null

	return (
		<div className='grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 md:grid-cols-3'>
			{items.map((item, index) => {
				const slug = typeof item.blockType === 'string' ? item.blockType : null
				const config = slug ? blocksBySlug[slug] : undefined
				const { Render } = config ?? {}
				if (!Render) return null
				return (
					<div
						key={index}
						className={cn(
							variant === 'card' && 'rounded-md bg-card p-4 shadow-sm',
							variant === 'bordered' && 'rounded-md border p-4'
						)}
					>
						<Render data={item} />
					</div>
				)
			})}
		</div>
	)
}

/**
 * Absorbed `columns`' own role (a fixed 2-column layout, each column its
 * own nested `BlocksField`) — that was a narrower special case of exactly
 * what this block already needed to be: a general "compose blocks
 * visually" primitive, not two overlapping ones. `variant` controls how
 * each item is wrapped when rendered publicly (`GridBlockRender` above);
 * it has no effect in the admin editor itself, which always shows a plain
 * `BlocksField` list regardless of `variant`.
 */
export const gridBlock: BlockConfig = {
	slug: 'grid',
	label: 'Grid',
	schema: gridBlockSchema,
	defaultValue: { variant: 'default', items: [] },
	Fields: GridBlockFields,
	Render: GridBlockRender,
	Icon: IconLayoutGrid
}
