import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { revalidateDocs, revalidateDocsDelete } from './hooks/revalidate'
import { stampAuthor } from './hooks/stamp-author'

export const docs: CollectionConfig = defineCollection<'docs'>({
	slug: 'docs',
	path: 'docx',
	access: {
		create: authenticated,
		read: authenticatedOrPublished,
		update: authenticated,
		delete: authenticated
	},
	admin: {
		defaultColumns: ['title', 'category', 'slug'],
		groupBy: 'category'
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
					label: 'Category',
					admin: {
						description:
							'Main section grouping (e.g., "Getting Started", "Concepts", "API Reference")'
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
						description:
							'Used in the URL. If empty, it will be the same as the title.',
						position: 'sidebar'
					}
				},
				{
					type: 'group',
					name: 'author',
					label: 'Author',
					description:
						"A denormalized snapshot of whoever created this document, auto-set once on create, empty until the first publish. A real relationship isn't possible here (users are deliberately excluded from RelationshipField, see its own doc comment, @baseconfig/core), and looking the user up again on every read just to show a name/email would be needless work for something that never changes after creation, so the fields worth displaying are copied in directly instead of just an id.",
					fields: [
						{
							name: 'id',
							type: 'text',
							label: 'ID',
							admin: { readOnly: true }
						},
						{
							name: 'name',
							type: 'text',
							label: 'Name',
							admin: { readOnly: true }
						},
						{
							name: 'email',
							type: 'email',
							label: 'Email',
							admin: { readOnly: true }
						},
						{
							name: 'image',
							type: 'text',
							label: 'Image URL',
							admin: { readOnly: true }
						}
					]
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
		beforeChange: [stampAuthor],
		afterChange: [revalidateDocs],
		afterDelete: [revalidateDocsDelete]
	}
})
