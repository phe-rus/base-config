import { z } from 'zod'
import { relationshipValueSchema } from '../types'
import { RelationshipField } from '../fields/relationship-field'
import type { BlockConfig, BlockFieldsProps } from './types'

export const formBlockSchema = z.object({
	blockType: z.literal('form'),
	form: relationshipValueSchema.optional()
})

/**
 * Embeds a `forms` document into a page's own `blocks` field — the
 * plugins/form-builder's own public-facing piece. Only picks *which* form
 * to show; the actual rendering (fields, submit handling against
 * `POST /api/forms/:id/submit`) is a public-page concern, not this admin
 * field's — see `plugins/form-builder/plugin.ts`'s own doc comment for the
 * broader "not done yet" gap (no public page renderer exists in this repo
 * at all yet, for any block).
 */
function FormBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<form.AppField name={`${path}.form`}>
			{() => <RelationshipField label='Form' targetType='forms' />}
		</form.AppField>
	)
}

export const formBlock: BlockConfig = {
	slug: 'form',
	label: 'Form',
	schema: formBlockSchema,
	defaultValue: {
		form: undefined
	},
	Fields: FormBlockFields
}
