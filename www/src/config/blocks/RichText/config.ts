import { defineBlock } from '@baseconfig/core'
import { IconArticle } from '@tabler/icons-react'

export const richTextBlock = defineBlock({
	slug: 'richtext',
	label: 'Rich text',
	Icon: IconArticle,
	interfaceName: 'RichTextBlock',
	fields: [{ name: 'content', type: 'richtext', label: 'Content' }]
})
