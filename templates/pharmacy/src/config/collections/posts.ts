import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'

export const posts: CollectionConfig = defineCollection({
	slug: 'posts',
	tabs: [
		{
			tab: 'content',
			label: 'Content',
			flat: true,
			fields: [
				{
					name: 'body',
					type: 'richtext',
					label: 'Body'
				}
			]
		}
	]
})
