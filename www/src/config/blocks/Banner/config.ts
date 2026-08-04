import { defineBlock } from '@baseconfig/core'
import { IconAd2 } from '@tabler/icons-react'

export const bannerBlock = defineBlock({
	slug: 'banner',
	label: 'Banner',
	Icon: IconAd2,
	interfaceName: 'BannerBlock',
	fields: [
		{ name: 'content', type: 'richtext', label: 'Content' },
		{
			name: 'image',
			type: 'upload',
			label: 'Background image',
			accept: 'image/*',
			// The block-specific storage subfolder the old hand-written
			// `Fields.tsx` hardcoded as `[uploadFolder, id, 'banner']`; the
			// generic `case 'upload'` renderer (fields/renderer.tsx) builds
			// the exact same path from `field.prefix` now that `Fields` is
			// derived, not hand-written.
			prefix: 'banner'
		},
		{ name: 'links', type: 'links', label: 'Links' }
	]
})
