import type { BasiccnContent } from '@pherus/basiccn'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const richTextBlockSchema = z.object({
	blockType: z.literal('richtext'),
	content: z.custom<BasiccnContent>().optional()
})

function RichTextBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<form.AppField name={`${path}.content`}>
			{(f: any) => (
				<f.RichText label='Content' placeholder='Write something…' />
			)}
		</form.AppField>
	)
}

export const richTextBlock: BlockConfig = {
	slug: 'richtext',
	label: 'Rich text',
	schema: richTextBlockSchema,
	defaultValue: { content: undefined },
	Fields: RichTextBlockFields
}
