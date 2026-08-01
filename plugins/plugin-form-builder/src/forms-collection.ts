import { defineCollection } from '@baseconfig/core'

/**
 * One row of a form's own `fields` array, modeled on Payload's own
 * `@payloadcms/plugin-form-builder` field blocks (text/email/textarea/
 * select/checkbox), simplified to one fixed row shape instead of a real
 * per-type block picker (this repo's `array` field type has no such picker
 * yet; see `packages/config/CLAUDE.md`'s "Field types", the "layout/grouping"
 * gap). `options` is a flat comma-separated string, only read when
 * `type: 'select'` (a real nested array-of-options would need array
 * nesting this repo doesn't support yet either).
 */
export type FormFieldRow = {
	name: string
	label: string
	type: 'text' | 'email' | 'textarea' | 'checkbox' | 'select'
	required?: boolean
	options?: string
}

/** One configured email, modeled on Payload's own form-builder: `{{fieldName}}` in `to`/`from`/`subject`/`message` gets interpolated against the submission's own data at send time (see `endpoints.ts`'s `interpolate()`). */
export type FormEmailRow = {
	to: string
	from: string
	subject: string
	message?: string
}

export type FormData = {
	fields?: FormFieldRow[]
	confirmationType?: 'message' | 'redirect'
	confirmationMessage?: string
	redirectUrl?: string
	emails?: FormEmailRow[]
}

/**
 * The `forms` collection: an admin defines a form's own field list,
 * post-submit confirmation, and which emails to send, all from the admin
 * UI, same as Payload's own form-builder plugin. Added to `www/src/config`
 * via `formBuilderPlugin()` (`plugin.ts`), never hand-registered directly;
 * see that file's own doc comment.
 */
export const formsCollection = defineCollection({
	slug: 'forms',
	label: 'Forms',
	columns: [{ key: 'title', label: 'Title' }],
	tabs: [
		{
			tab: 'fields',
			label: 'Fields',
			flat: true,
			fields: [
				{
					name: 'fields',
					type: 'array',
					label: 'Form fields',
					fields: [
						{
							name: 'label',
							type: 'text',
							label: 'Label',
							required: true
						},
						{
							name: 'name',
							type: 'text',
							label: 'Field name (used as {{name}} in emails)',
							required: true
						},
						{
							name: 'type',
							type: 'select',
							label: 'Type',
							required: true,
							defaultValue: 'text',
							options: [
								{ label: 'Text', value: 'text' },
								{ label: 'Email', value: 'email' },
								{ label: 'Textarea', value: 'textarea' },
								{ label: 'Checkbox', value: 'checkbox' },
								{ label: 'Select', value: 'select' }
							]
						},
						{ name: 'required', type: 'checkbox', label: 'Required' },
						{
							name: 'options',
							type: 'text',
							label: 'Options (comma-separated, only for Select)'
						}
					]
				}
			]
		},
		{
			tab: 'confirmation',
			label: 'Confirmation',
			flat: true,
			fields: [
				{
					name: 'confirmationType',
					type: 'select',
					label: 'On submit',
					defaultValue: 'message',
					options: [
						{ label: 'Show a message', value: 'message' },
						{ label: 'Redirect', value: 'redirect' }
					]
				},
				{
					name: 'confirmationMessage',
					type: 'textarea',
					label: 'Confirmation message'
				},
				{
					name: 'redirectUrl',
					type: 'text',
					label: 'Redirect URL (only used when redirecting)'
				}
			]
		},
		{
			tab: 'emails',
			label: 'Emails',
			flat: true,
			fields: [
				{
					name: 'emails',
					type: 'array',
					label: 'Emails to send on submit',
					fields: [
						{
							name: 'to',
							type: 'text',
							label: 'To (supports {{fieldName}})',
							required: true
						},
						{ name: 'from', type: 'text', label: 'From', required: true },
						{
							name: 'subject',
							type: 'text',
							label: 'Subject (supports {{fieldName}})',
							required: true
						},
						{
							name: 'message',
							type: 'textarea',
							label:
								'Message (supports {{fieldName}}, {{*}} for every field as a list)'
						}
					]
				}
			]
		}
	]
})
