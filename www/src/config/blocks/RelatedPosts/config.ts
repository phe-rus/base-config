import { defineBlock } from '@baseconfig/core'
import { IconNews } from '@tabler/icons-react'
import { RelatedPostsBlockFields } from './Fields'

export const relatedPostsBlock = defineBlock({
	slug: 'relatedPosts',
	label: 'Related posts',
	interfaceName: 'RelatedPostsBlock',
	fields: [
		{ name: 'label', type: 'text', label: 'Label' },
		{
			name: 'mode',
			type: 'select',
			label: 'Mode',
			defaultValue: 'manual',
			options: [
				{ label: 'Manual', value: 'manual' },
				{ label: 'Keyword', value: 'keyword' }
			]
		},
		{
			name: 'ids',
			type: 'array',
			label: 'Posts',
			description: 'Manually chosen posts, shown when Mode is Manual.',
			fields: [{ name: 'id', type: 'text', label: 'ID' }]
		},
		{ name: 'keywords', type: 'keywords', label: 'Keywords' }
	],
	Fields: RelatedPostsBlockFields,
	Icon: IconNews
})
