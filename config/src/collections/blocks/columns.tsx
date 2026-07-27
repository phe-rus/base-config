import { z } from 'zod'
import { BlocksField } from '../fields/blocks-field'
import type { BlockConfig, BlockFieldsProps } from './types'

// A column's own contents are validated loosely (just "has a blockType")
// rather than against the full block union, to avoid a circular schema
// reference back to `blocksSchema` in `./index.ts` — same lenient approach
// this route already used for flexible block-like content.
const looseBlock = z.object({ blockType: z.string() }).loose()

export const columnsBlockSchema = z.object({
	blockType: z.literal('columns'),
	columns: z.array(z.array(looseBlock)).optional()
})

function ColumnsBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='grid gap-3 sm:grid-cols-2'>
			{[0, 1].map((index) => (
				<div key={index} className='rounded-md border border-dashed p-2'>
					<BlocksField
						form={form}
						name={`${path}.columns[${index}]`}
						label={`Column ${index + 1}`}
						exclude={['columns']}
					/>
				</div>
			))}
		</div>
	)
}

export const columnsBlock: BlockConfig = {
	slug: 'columns',
	label: 'Columns / layout',
	schema: columnsBlockSchema,
	defaultValue: { columns: [[], []] },
	Fields: ColumnsBlockFields
}
