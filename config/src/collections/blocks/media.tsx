import { IconPhoto } from '@tabler/icons-react'
import { z } from 'zod'
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../../admin/widgets/storage-widget'
import { uploadValueSchema } from '../../fields/schema'
import { uploadFile } from '../../fields/upload'
import type { BlockConfig, BlockFieldsProps } from './types'

export const mediaBlockSchema = z.object({
	blockType: z.literal('media'),
	image: uploadValueSchema.optional(),
	alt: z.string().optional(),
	caption: z.string().optional()
})

function MediaBlockFields({ form, path, uploadFolder, id }: BlockFieldsProps) {
	const uploadPrefix = [uploadFolder, id, 'media'].filter(Boolean).join('/')

	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.image`}>
				{(f: any) => (
					<f.Upload
						label='Image'
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
	Fields: MediaBlockFields,
	Icon: IconPhoto
}
