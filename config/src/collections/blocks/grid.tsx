import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

const tileSchema = z.object({
	image: z.string().optional(),
	title: z.string().optional(),
	text: z.string().optional()
})

export const gridBlockSchema = z.object({
	blockType: z.literal('grid'),
	tiles: z.array(tileSchema).optional()
})

function GridBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<form.AppField name={`${path}.tiles`}>
			{(f: any) => (
				<f.ArrayField
					label='Tiles'
					description='Add cards to display in a grid.'
				>
					{({ path: tilePath }: { path: string }) => (
						<div className='flex flex-col gap-3'>
							<form.AppField name={`${tilePath}.image`}>
								{(tf: any) => (
									<tf.Input label='Image URL' placeholder='https://…' />
								)}
							</form.AppField>
							<form.AppField name={`${tilePath}.title`}>
								{(tf: any) => <tf.Input label='Title' />}
							</form.AppField>
							<form.AppField name={`${tilePath}.text`}>
								{(tf: any) => <tf.Textarea label='Text' />}
							</form.AppField>
						</div>
					)}
				</f.ArrayField>
			)}
		</form.AppField>
	)
}

export const gridBlock: BlockConfig = {
	slug: 'grid',
	label: 'Grid',
	schema: gridBlockSchema,
	defaultValue: { tiles: [] },
	Fields: GridBlockFields
}
