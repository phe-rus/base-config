import { IconAd2 } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const bannerBlockSchema = z.object({
	blockType: z.literal('banner'),
	heading: z.string().optional(),
	image: z.string().optional(),
	buttonLabel: z.string().optional(),
	buttonLink: z.string().optional()
})

function BannerBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.heading`}>
				{(f: any) => <f.Input label='Heading' placeholder='Banner heading' />}
			</form.AppField>
			<form.AppField name={`${path}.image`}>
				{(f: any) => (
					<f.Input
						label='Background image URL'
						placeholder='https://… (optional)'
					/>
				)}
			</form.AppField>
			<form.AppField name={`${path}.buttonLabel`}>
				{(f: any) => <f.Input label='Button label' placeholder='Optional' />}
			</form.AppField>
			<form.AppField name={`${path}.buttonLink`}>
				{(f: any) => (
					<f.Input label='Button link' placeholder='https://… (optional)' />
				)}
			</form.AppField>
		</div>
	)
}

export const bannerBlock: BlockConfig = {
	slug: 'banner',
	label: 'Banner',
	schema: bannerBlockSchema,
	defaultValue: {
		heading: undefined,
		image: undefined,
		buttonLabel: undefined,
		buttonLink: undefined
	},
	Fields: BannerBlockFields,
	Icon: IconAd2
}
