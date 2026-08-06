import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'
import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

// `<'docs'>` is explicit here on purpose: `defineCollection`'s own `TSlug`
// inference can't reach into `hooks.beforeChange`'s own parameter type from
// just `slug: 'docs'` (a real TS limitation, generic inference doesn't
// flow into a contravariant callback-parameter position through a
// conditional type like `GeneratedCollectionDoc<TSlug>`, confirmed
// empirically: without this, `data` silently widens to
// `Partial<Record<string, unknown>>`, the exact untyped shape this generic
// exists to replace). Naming the slug explicitly is what actually gets
// `data`/`ctx.user` typed against the real generated `Docs` interface below.
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
		// Labels come from each field's own config (`category`'s own `label`
		// below is "Category"), `CollectionTable` also auto-detects
		// `category` as array-valued from the real row data and gives it a
		// checkbox-list quick filter for free (`@baseconfig/ui`'s
		// `DataTable`).
		defaultColumns: ['title', 'category', 'slug'],
		// Docs sharing a category end up next to each other in the table (no
		// section headers, same flat table, see `admin.groupBy`'s own doc
		// comment, @baseconfig/core).
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
	// Stamps `author` with a snapshot of whoever created the document, once,
	// on create only (an update never overwrites the original author), see
	// the `author` group field's own description above for why a
	// denormalized snapshot instead of a real relationship or a bare id.
	hooks: {
		beforeChange: [
			({ operation, data, req }) => {
				if (operation !== 'create' || data.author) return data
				if (!req.user) return data
				return {
					...data,
					author: {
						id: req.user.id,
						name: req.user.name,
						email: req.user.email,
						image: req.user.image ?? undefined
					}
				}
			}
		]
	}
})
