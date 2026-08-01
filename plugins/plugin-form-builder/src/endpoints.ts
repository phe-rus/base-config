import { createDocument, createId, getDocument } from '@baseconfig/core'
import type { EndpointFactory, EndpointFactoryBindings } from '@baseconfig/core'
import { getFormBuilderOptions } from './plugin'
import type { FormData } from './forms-collection'

/**
 * `{{fieldName}}` → that field's submitted value, `{{*}}` → every
 * submitted field as a `name: value` list, same convention Payload's own
 * form-builder plugin uses for its `to`/`from`/`subject`/`message` fields.
 */
function interpolate(template: string, data: Record<string, unknown>): string {
	return template.replace(/\{\{(\*|[\w.-]+)\}\}/g, (_match, key: string) => {
		if (key === '*') {
			return Object.entries(data)
				.map(([name, value]) => `${name}: ${String(value)}`)
				.join('\n')
		}
		return data[key] !== undefined ? String(data[key]) : ''
	})
}

/**
 * The public half of the form builder, an `EndpointFactory`
 * (`@baseconfig/core`'s own `db/content-route.ts`), not a function a consumer
 * calls directly. `plugin.ts` registers this itself, into
 * `config.endpointFactories`, the moment `formBuilderPlugin()` runs, so
 * `createHandler()` picks it up automatically and a consumer never imports
 * this file at all. `handleEmail`/`beforeEmail` are both read from
 * `getFormBuilderOptions()` (this plugin's own isomorphic-safe registry,
 * configured once via `formBuilderPlugin({handleEmail, beforeEmail})` in
 * `base.config.ts`), this factory only ever needs `db` off its own
 * `EndpointFactoryBindings` argument. One real endpoint: `POST /api/forms/:id/submit`,
 * unauthenticated by design (matching Payload's own default for its
 * equivalent `/api/form-submissions` route): a public visitor has no
 * session to check. Validates submitted data against the referenced form's
 * own `fields` config (required-field presence only; real per-type
 * validation, e.g. a genuine email-format check, isn't attempted here),
 * stores a `form-submissions` row (see that collection's own doc comment
 * for why it's never publicly readable), then hands off every configured
 * email to `handleEmail` (best-effort: one failing call doesn't fail the
 * submission itself, it's logged and swallowed) before returning the
 * form's own confirmation config (a message to show, or a URL to redirect
 * to).
 */
export const formBuilderEndpoints: EndpointFactory = ({
	db
}: EndpointFactoryBindings) => {
	return [
		{
			collection: 'forms',
			path: '/:id/submit',
			method: 'post',
			handler: async (c) => {
				const formId = c.req.param('id')
				if (!formId) return c.json({ error: 'Form not found' }, 404)
				const form = await getDocument(db, 'forms', formId, {
					publishedOnly: false
				})
				if (!form) return c.json({ error: 'Form not found' }, 404)

				let body: Record<string, unknown>
				try {
					body = await c.req.json()
				} catch {
					return c.json({ error: 'Invalid JSON body' }, 400)
				}

				const formData = form.data as FormData
				const fields = formData.fields ?? []

				const missing = fields
					.filter(
						(field) =>
							field.required &&
							(body[field.name] === undefined || body[field.name] === '')
					)
					.map((field) => field.name)
				if (missing.length > 0) {
					return c.json(
						{ error: 'Missing required fields', fields: missing },
						400
					)
				}

				const submissionData: Record<string, unknown> = {}
				for (const field of fields) {
					if (field.name in body) submissionData[field.name] = body[field.name]
				}

				const row = await createDocument(db, 'form-submissions', {
					id: createId(),
					status: 'draft',
					data: {
						form: formId,
						submittedAt: new Date().toISOString(),
						submissionData: JSON.stringify(submissionData, null, 2)
					}
				})

				const { beforeEmail, handleEmail } = getFormBuilderOptions()
				if (handleEmail && formData.emails?.length) {
					const interpolated = formData.emails.map((email) => ({
						to: interpolate(email.to, submissionData),
						from: interpolate(email.from, submissionData),
						subject: interpolate(email.subject, submissionData),
						html: interpolate(email.message ?? '', submissionData)
					}))
					// `beforeEmail` (configured once, via `formBuilderPlugin({beforeEmail})`
					// in `base.config.ts`, see `plugin.ts`'s own doc comment) gets the
					// last word on what actually gets handed to `handleEmail`.
					const emailsToHandle = beforeEmail
						? beforeEmail(interpolated, { doc: row })
						: interpolated

					await Promise.all(
						emailsToHandle.map((email) =>
							handleEmail(email).catch((error) => {
								console.error(
									'formBuilderEndpoints: handleEmail threw for a form submission',
									error
								)
							})
						)
					)
				}

				const confirmation =
					formData.confirmationType === 'redirect'
						? { type: 'redirect' as const, url: formData.redirectUrl ?? '' }
						: {
								type: 'message' as const,
								message: formData.confirmationMessage ?? 'Thank you!'
							}

				return c.json({ ok: true, id: row.id, confirmation }, 201)
			}
		}
	]
}
