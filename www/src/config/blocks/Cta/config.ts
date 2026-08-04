import { defineBlock } from '@baseconfig/core'
import { IconClick } from '@tabler/icons-react'

export const ctaBlock = defineBlock({
	slug: 'cta',
	label: 'Call to action',
	interfaceName: 'CtaBlock',
	fields: [
		{ name: 'content', type: 'richtext', label: 'Content' },
		{ name: 'links', type: 'links', label: 'Links' }
	],
	Icon: IconClick
})
