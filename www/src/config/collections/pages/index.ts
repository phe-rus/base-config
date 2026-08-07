import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { revalidatePage, revalidatePageDelete } from './hooks/revalidate'

export const pages: CollectionConfig = defineCollection({
	slug: 'pages',
	access: {
		create: authenticated,
		read: authenticatedOrPublished,
		update: authenticated,
		delete: authenticated
	},
	tabs: [
		{
			tab: 'hero',
			label: 'Hero',
			fields: [
				{
					name: 'image',
					type: 'upload',
					label: 'Image',
					accept: 'image/*'
				},
				{
					name: 'content',
					type: 'richtext',
					label: 'Hero content',
					placeholder: 'Optional supporting copy'
				},
				{
					name: 'links',
					type: 'links',
					label: 'Links',
					relationTo: ['docs', 'pages'],
					admin: {
						description: 'Buttons or links shown in the hero.'
					}
				}
			]
		},
		{
			tab: 'content',
			label: 'Content',
			fields: [
				{
					name: 'content',
					type: 'blocks',
					label: 'Content',
					admin: {
						description:
							'Build the page out of blocks — including a "Related posts" block wherever you want one.'
					}
				}
			]
		},
		{
			tab: 'metadata',
			label: 'Metadata',
			fields: [{ name: 'metadata', type: 'meta' }]
		}
	],
	hooks: {
		afterChange: [revalidatePage],
		afterDelete: [revalidatePageDelete]
	}
})
