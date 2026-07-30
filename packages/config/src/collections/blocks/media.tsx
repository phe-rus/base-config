import { IconPhoto } from '@tabler/icons-react'
import { z } from 'zod'
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../../admin/widgets/storage-widget'
import { uploadValueSchema } from '../../fields/schema'
import { uploadFile } from '../../fields/upload'
import type { BlockConfig, BlockFieldsProps } from './types'

/** No `alt`/`caption` — the real upload value (`uploadValueSchema`'s own `name`/`url`/`size`) already covers what those stood in for; this block is just an image. */
export const mediaBlockSchema = z.object({
	blockType: z.literal('media'),
	image: uploadValueSchema.optional()
})

function MediaBlockFields({ form, path, uploadFolder, id }: BlockFieldsProps) {
	const uploadPrefix = [uploadFolder, id, 'media'].filter(Boolean).join('/')

	return (
		<form.AppField name={`${path}.image`}>
			{(f: any) => (
				<f.Upload
					label='Image'
					accept='image/*'
					onUpload={(file: File) => uploadFile(file, uploadPrefix || undefined)}
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
	)
}

export const mediaBlock: BlockConfig = {
	slug: 'media',
	label: 'Media / image',
	schema: mediaBlockSchema,
	defaultValue: { image: undefined },
	Fields: MediaBlockFields,
	Icon: IconPhoto
}
