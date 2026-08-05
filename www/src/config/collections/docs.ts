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
					type: 'keywords',
					relationTo: 'category',
					label: 'Category / Section',
					admin: {
						description: 'Main section grouping (e.g., "Getting Started", "Concepts", "API Reference")'
					}
				},
				{
					name: 'parent',
					type: 'relationship',
					relationTo: 'docs',
					label: 'Parent Document',
					admin: {
						description: 'Select a parent doc if this is a sub-page'
					}
				},
				{
					name: 'order',
					type: 'number',
					label: 'Order',
					defaultValue: 0,
					admin: {
						description: 'Display priority within the section/category',
						position: 'sidebar'
					}
				},
				{
					name: 'slug',
					type: 'slug',
					label: 'Slug',
					admin: {
						description: 'Used in the URL. If empty, it will be the same as the title.',
						position: 'sidebar'
					}
				}
			]
		}
	]
})
