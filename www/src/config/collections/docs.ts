import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const docs: CollectionConfig = defineCollection({
	slug: 'docs',
	path: 'docx',
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
		},
		{
			tab: 'settings',
			label: 'Settings',
			flat: true,
			fields: [
				{
					name: 'category',
					type: 'relationship',
					relationTo: 'category',
					hasMany: false,
					label: 'Category / Section',
					description:
						'Main section grouping (e.g., "Getting Started", "Concepts", "API Reference")'
				},
				{
					name: 'parent',
					type: 'relationship',
					relationTo: 'docs',
					label: 'Parent Document',
					description: 'Select a parent doc if this is a sub-page'
				},
				{
					name: 'order',
					type: 'number',
					label: 'Order',
					defaultValue: 0,
					description: 'Display priority within the section/category'
				},
				{
					name: 'slug',
					type: 'slug',
					label: 'Slug',
					description:
						'Used in the URL. If empty, it will be the same as the title.'
				}
			]
		}
	]
})
