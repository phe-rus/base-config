import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'

export const users: CollectionConfig = defineCollection({
	slug: 'users',
	auth: true,
	admin: {
		useAsTitle: 'name'
	},
	tabs: [
		{
			tab: 'profile',
			label: 'Profile',
			flat: true,
			fields: [
				{
					name: 'image',
					type: 'upload',
					label: 'Image',
					accept: 'image/*'
				},
				{
					name: 'name',
					type: 'text',
					label: 'Name'
				},
				{
					name: 'email',
					type: 'text',
					label: 'Email',
					required: true
				},
				{
					name: 'emailVerified',
					type: 'checkbox',
					label: 'Email Verified'
				},
				{
					name: 'role',
					type: 'select',
					label: 'Role',
					options: [
						{ label: 'Admin', value: 'admin' },
						{ label: 'User', value: 'user' }
					],
					required: true,
					defaultValue: 'user'
				},
				{
					name: 'twoFactorEnabled',
					type: 'checkbox',
					label: 'Two-Factor Enabled',
					disabled: true
				},
				{
					name: 'bio',
					type: 'textarea',
					label: 'Bio'
				}
			]
		}
	]
})
