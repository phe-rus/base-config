import { defineBlock } from '@baseconfig/core'
import { IconPhoto } from '@tabler/icons-react'

export const mediaBlock = defineBlock({
	slug: 'media',
	label: 'Media / image',
	interfaceName: 'MediaBlock',
	fields: [
		{
			name: 'image',
			type: 'upload',
			label: 'Image',
			accept: 'image/*',
			// The block-specific storage subfolder, see the `banner` block's
			// own comment for why it lives on the field now instead of in a
			// hand-written `Fields.tsx`.
			prefix: 'media'
		}
	],
	Icon: IconPhoto
})
