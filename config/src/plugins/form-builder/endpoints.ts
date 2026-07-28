import { createId } from '../../collections/id'
import type { ContentDatabase } from '../../db/content-queries'
import { createDocument, getDocument } from '../../db/content-queries'
import type { ContentEndpoint } from '../../db/content-route'
import type { FormData } from './forms-collection'

/**
 * A plain callback rather than Cloudflare's real `send_email` binding
 * directly — same reasoning `R2BucketLike`/`KVNamespaceLike` already
 * follow (no `@cloudflare/workers-types` dependency for one ambient type),
 * taken one step further here since actually sending mail needs more than
 * one binding call (MIME construction, etc.) — the consumer's own
 * `www/src/api/index.ts` implements this however it wants, closing over
 * `env.EMAIL` internally.
 */
export type SendEmailFn = (email: {
	to: string
	from: string
	subject: string
	html: string
}) => Promise<void>

export type FormBuilderEndpointsOptions = {
	db: ContentDatabase
	/** Omit to accept submissions without ever sending mail (still stores them, still returns a confirmation). */
	sendEmail?: SendEmailFn
}

/**
 * `{{fieldName}}` → that field's submitted value, `{{*}}` → every
 * submitted field as a `name: value` list — same convention Payload's own
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
 * The public half of the form builder — see `plugin.ts`'s own doc comment
 * for why this is a separate call from `formBuilderPlugin()`, not folded
 * into it. One real endpoint: `POST /api/forms/:id/submit`, unauthenticated
 * by design (matching Payload's own default for its equivalent
 * `/api/form-submissions` route) — a public visitor has no session to
 * check. Validates submitted data against the referenced form's own
 * `fields` config (required-field presence only — real per-type validation,
 * e.g. a genuine email-format check, isn't attempted here), stores a
 * `form-submissions` row (see that collection's own doc comment for why
 * it's never publicly readable), then fires every configured email
 * (best-effort — one failing email doesn't fail the submission itself, it's
 * logged and swallowed) before returning the form's own confirmation
 * config (a message to show, or a URL to redirect to).
 */
export function formBuilderEndpoints({
	db,
	sendEmail
}: FormBuilderEndpointsOptions): ContentEndpoint[] {
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

				if (sendEmail && formData.emails?.length) {
					await Promise.all(
						formData.emails.map((email) =>
							sendEmail({
								to: interpolate(email.to, submissionData),
								from: interpolate(email.from, submissionData),
								subject: interpolate(email.subject, submissionData),
								html: interpolate(email.message ?? '', submissionData)
							}).catch((error) => {
								console.error(
									'formBuilderEndpoints: failed to send an email for a form submission',
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
