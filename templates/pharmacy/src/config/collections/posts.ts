import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const posts: CollectionConfig = defineCollection({
	slug: 'posts',
	access: {
		create: authenticated,
		read: authenticatedOrPublished,
		update: authenticated,
		delete: authenticated
	},
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
