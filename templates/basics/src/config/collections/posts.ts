import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'

// `title`/`slug` are provided automatically by every collection — no need
// to declare them here; `CollectionForm` already renders an editable
// title/slug pair for free. Only declare the fields that live inside this
// collection's own `data`.
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
