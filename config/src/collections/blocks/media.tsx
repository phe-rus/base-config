import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const mediaBlockSchema = z.object({
	blockType: z.literal('media'),
	image: z.string().optional(),
	alt: z.string().optional(),
	caption: z.string().optional()
})

function MediaBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.image`}>
				{(f: any) => <f.Input label='Image URL' placeholder='https://…' />}
			</form.AppField>
			<form.AppField name={`${path}.alt`}>
				{(f: any) => (
					<f.Input label='Alt text' placeholder='Describe the image' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.caption`}>
				{(f: any) => (
					<f.Textarea label='Caption' placeholder='Optional caption' />
				)}
			</form.AppField>
		</div>
	)
}

export const mediaBlock: BlockConfig = {
	slug: 'media',
	label: 'Media / image',
	schema: mediaBlockSchema,
	defaultValue: { image: undefined, alt: undefined, caption: undefined },
	Fields: MediaBlockFields
}
