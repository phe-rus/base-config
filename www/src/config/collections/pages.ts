import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

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
					type: 'array',
					label: 'Links',
					description: 'Buttons or links shown in the hero.',
					fields: [
						{
							name: 'label',
							type: 'text',
							label: 'Label',
							placeholder: 'Learn more'
						},
						{
							name: 'href',
							type: 'text',
							label: 'Link',
							placeholder: 'https://…'
						}
					]
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
					description:
						'Build the page out of blocks — including a "Related posts" block wherever you want one.'
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
