import { defineCollection } from '@base/config'

/**
 * The `form-submissions` collection — one row per real public submission,
 * created only via `formBuilderEndpoints()`'s public `/api/forms/:id/submit`
 * endpoint (`endpoints.ts`), never through the standard admin-only
 * `POST /:collection` route. Deliberately **never published** — every
 * submission is created with `status: 'draft'` and nothing in this plugin
 * ever changes that, so `content-route.ts`'s existing `publishedOnly`
 * filter (applied to every non-admin request) already makes a submission
 * invisible to anyone but an admin, with no new "admin-only reads" route
 * concept needed.
 */
export const formSubmissionsCollection = defineCollection({
	slug: 'form-submissions',
	label: 'Form Submissions',
	admin: { useAsTitle: 'form' },
	columns: [
		{ key: 'form', label: 'Form' },
		{ key: 'submittedAt', label: 'Submitted' }
	],
	filterKey: 'form',
	tabs: [
		{
			tab: 'submission',
			label: 'Submission',
			flat: true,
			fields: [
				{ name: 'form', type: 'text', label: 'Form ID', disabled: true },
				{
					name: 'submittedAt',
					type: 'text',
					label: 'Submitted at',
					disabled: true
				},
				{
					name: 'submissionData',
					type: 'textarea',
					// Stored (and shown) as a JSON *string*, not a real nested
					// object — `textarea`'s own value is always a string (see
					// `use-field-state.ts`), and `json` isn't wired into
					// `FieldConfig`'s union yet (see `fields/types.ts`'s own doc
					// comment) — stringifying here avoids depending on that
					// still-unwired field type for something this plugin can
					// sidestep entirely.
					label: 'Submitted data (JSON)',
					disabled: true
				}
			]
		}
	]
})
