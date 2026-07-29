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
import { LinksField } from '../fields/links-field'
import { linksSchema, type LinkItemValue } from '../types'
import type { BlockConfig, BlockFieldsProps } from './types'

export const bannerBlockSchema = z.object({
	blockType: z.literal('banner'),
	content: z.custom<BasiccnContent>().optional(),
	image: uploadValueSchema.optional(),
	links: linksSchema.optional()
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
			<LinksField form={form} name={`${path}.links`} />
		</div>
	)
}

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender` — see that function's own doc comment for the full explanation. */
function BannerBlockRender({ data }: { data: Record<string, unknown> }) {
	const content = data.content as BasiccnContent | undefined
	const image = data.image as { url: string } | undefined
	const links = Array.isArray(data.links) ? (data.links as LinkItemValue[]) : []

	if (!content && !image && links.length === 0) return null

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
			{links.length > 0 ? (
				<div className='flex flex-wrap items-center justify-center gap-2'>
					{links.map((link, index) =>
						link.label && link.to ? (
							<a
								key={index}
								href={link.to}
								className={buttonVariants({ variant: link.appearance })}
								target={link.openInNewTab ? '_blank' : undefined}
								rel={link.openInNewTab ? 'noreferrer' : undefined}
							>
								{link.label}
							</a>
						) : null
					)}
				</div>
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
		links: []
	},
	Fields: BannerBlockFields,
	Render: BannerBlockRender,
	Icon: IconAd2
}
