import type { BasiccnContent } from '@base/ui/basiccn'
import { Preview } from '@base/ui/basiccn/preview'
import { buttonVariants } from '@base/ui/components/button'
import { IconAd2 } from '@tabler/icons-react'
import { z } from 'zod'
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../../admin/widgets/storage-widget'
import { uploadValueSchema } from '../../fields/schema'
import { uploadFile } from '../../fields/upload'
import { appearanceValues } from '../types'
import type { BlockConfig, BlockFieldsProps } from './types'

export const bannerBlockSchema = z.object({
	blockType: z.literal('banner'),
	content: z.custom<BasiccnContent>().optional(),
	image: uploadValueSchema.optional(),
	variant: z.enum(appearanceValues).optional(),
	buttonLabel: z.string().optional(),
	link: z.string().optional()
})

function BannerBlockFields({ form, path, uploadFolder, id }: BlockFieldsProps) {
	const uploadPrefix = [uploadFolder, id, 'banner'].filter(Boolean).join('/')

	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.content`}>
				{(f: any) => (
					<f.RichText label='Content' placeholder='Write something…' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.image`}>
				{(f: any) => (
					<f.Upload
						label='Background image'
						accept='image/*'
						onUpload={(file: File) =>
							uploadFile(file, uploadPrefix || undefined)
						}
						renderBrowser={(browserProps: StorageWidgetTriggerProps) => (
							<StorageWidget
								{...browserProps}
								defaultFolder={uploadPrefix || undefined}
								accept='image/*'
							/>
						)}
					/>
				)}
			</form.AppField>
			<form.AppField name={`${path}.variant`}>
				{(f: any) => (
					<f.Select
						label='Button variant'
						defaultValue='default'
						options={appearanceValues.map((value) => ({
							label: value[0]?.toUpperCase() + value.slice(1),
							value
						}))}
					/>
				)}
			</form.AppField>
			<form.AppField name={`${path}.buttonLabel`}>
				{(f: any) => <f.Input label='Button label' placeholder='Optional' />}
			</form.AppField>
			<form.AppField name={`${path}.link`}>
				{(f: any) => (
					<f.Input label='Link' placeholder='https://… (optional)' />
				)}
			</form.AppField>
		</div>
	)
}

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender` — see that function's own doc comment for the full explanation. */
function BannerBlockRender({ data }: { data: Record<string, unknown> }) {
	const content = data.content as BasiccnContent | undefined
	const image = data.image as { url: string } | undefined
	const variant = data.variant as (typeof appearanceValues)[number] | undefined
	const buttonLabel =
		typeof data.buttonLabel === 'string' ? data.buttonLabel : undefined
	const link = typeof data.link === 'string' ? data.link : undefined

	if (!content && !image && !(buttonLabel && link)) return null

	return (
		<section className='flex flex-col items-center gap-4 py-12 text-center'>
			{image ? (
				<img
					src={image.url}
					alt=''
					className='max-h-64 w-full rounded-md object-cover'
				/>
			) : null}
			{content ? <Preview content={content} /> : null}
			{buttonLabel && link ? (
				<a href={link} className={buttonVariants({ variant })}>
					{buttonLabel}
				</a>
			) : null}
		</section>
	)
}

export const bannerBlock: BlockConfig = {
	slug: 'banner',
	label: 'Banner',
	schema: bannerBlockSchema,
	defaultValue: {
		content: undefined,
		image: undefined,
		variant: 'default',
		buttonLabel: undefined,
		link: undefined
	},
	Fields: BannerBlockFields,
	Render: BannerBlockRender,
	Icon: IconAd2
}
