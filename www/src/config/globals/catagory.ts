import type { GlobalConfig } from '@baseconfig/core/collections/types'
import { defineGlobal } from '@baseconfig/core'

export const category: GlobalConfig = defineGlobal({
	slug: 'category',
	label: 'Category',
	fields: [
		{
			name: 'category',
			type: 'array',
			label: 'Category',
			admin: {
				description: 'Use a custom keyword for the category order.'
			},
			fields: [
				{
					name: 'label',
					type: 'text',
					label: 'Category',
					placeholder: 'e.g. seo'
				},
				{
					name: 'order',
					type: 'number',
					label: 'Order',
					defaultValue: 0,
					admin: {
						description: 'Override the default order of this category in the nav list.'
					}
				}
			]
		}
	]
})
