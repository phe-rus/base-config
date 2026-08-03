import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const products: CollectionConfig = defineCollection({
	slug: 'products',
	access: {
		create: authenticated,
		read: authenticatedOrPublished,
		update: authenticated,
		delete: authenticated
	},
	tabs: [
		{
			tab: 'product',
			label: 'product',
			fields: [
				{
					name: 'quantity',
					type: 'number',
					label: 'Quantity'
				},
				{
					name: 'price',
					type: 'number',
					label: 'Price'
				},
				{
					name: 'stock',
					type: 'number',
					label: 'Stock',
					defaultValue: 0
				},
				{
					name: 'description',
					type: 'richtext',
					label: 'Description'
				}
			]
		},
		{
			tab: 'metadata',
			label: 'Metadata',
			fields: [{ name: 'metadata', type: 'meta' }]
		}
	]
})
