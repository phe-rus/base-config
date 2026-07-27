import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const ctaBlockSchema = z.object({
	blockType: z.literal('cta'),
	heading: z.string().optional(),
	text: z.string().optional(),
	buttonLabel: z.string().optional(),
	buttonLink: z.string().optional()
})

function CtaBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.heading`}>
				{(f: any) => (
					<f.Input label='Heading' placeholder='Call to action heading' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.text`}>
				{(f: any) => (
					<f.Textarea label='Text' placeholder='Short supporting text' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.buttonLabel`}>
				{(f: any) => <f.Input label='Button label' placeholder='Learn more' />}
			</form.AppField>
			<form.AppField name={`${path}.buttonLink`}>
				{(f: any) => <f.Input label='Button link' placeholder='https://…' />}
			</form.AppField>
		</div>
	)
}

export const ctaBlock: BlockConfig = {
	slug: 'cta',
	label: 'Call to action',
	schema: ctaBlockSchema,
	defaultValue: {
		heading: undefined,
		text: undefined,
		buttonLabel: undefined,
		buttonLink: undefined
	},
	Fields: CtaBlockFields
}
