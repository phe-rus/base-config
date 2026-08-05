import { defineBlock } from '@baseconfig/core'
import { IconNews } from '@tabler/icons-react'

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
			type: 'relationship',
			label: 'Pages',
			relationTo: 'pages',
			hasMany: true,
			admin: {
				description: 'Manually chosen pages, shown when Mode is Manual.'
			}
		},
		{ name: 'keywords', type: 'keywords', label: 'Keywords' }
	],
	Icon: IconNews
})
