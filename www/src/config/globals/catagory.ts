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
			description: 'Use a custom keyword for the category order.',
			fields: [
				{
					name: 'label',
					type: 'text',
					label: 'Category',
					placeholder: 'e.g. seo'
				}
			]
		}
	]
})
