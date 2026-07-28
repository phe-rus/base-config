import type { BlockConfig, BlockFieldsProps } from '@base/config'
import { getContentCollection } from '@base/config'
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '@base/ui/components/combobox'
import { FieldShell, useFieldState } from '@base/ui/forms'
import { useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'
import { z } from 'zod'

const formReferenceSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string()
})

export const formBlockSchema = z.object({
	blockType: z.literal('form'),
	form: formReferenceSchema.optional()
})

type FormReference = z.infer<typeof formReferenceSchema>
type Option = { label: string; value: string; slug: string }

/**
 * A small, self-contained picker rather than `@base/config`'s own shared
 * `RelationshipField` — that component's `targetType` is typed to *this
 * app's own* closed `CollectionSlug` union, which a plugin package can't
 * add `'forms'` to (see `@base/config`'s own `collections/types.ts` doc
 * history). `getContentCollection('forms')` is the plain-string-keyed
 * escape hatch built for exactly this (`@base/config`'s own barrel export).
 */
function useFormOptions(): Option[] {
	const { data } = useLiveQuery(getContentCollection('forms'))

	return useMemo(
		() =>
			data.map((row) => {
				const rowData = row.data as { title?: string; slug?: string }
				return {
					label: rowData.title || rowData.slug || 'Untitled',
					value: row.id,
					slug: rowData.slug ?? ''
				}
			}),
		[data]
	)
}

/** Calls `useFieldState()` itself, same as `@base/ui/forms`'s own field components (`Input`, etc.) — the `form.AppField` render-prop below just renders this, rather than calling the hook inline. */
function FormReferencePicker({ options }: { options: Option[] }) {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<FormReference | undefined>()
	const selected = options.find((option) => option.value === value?.id) ?? null

	return (
		<FieldShell label='Form' field={field} isInvalid={isInvalid}>
			<Combobox
				items={options}
				value={selected}
				onValueChange={(item: Option | null) => {
					handleChange(
						item
							? { id: item.value, slug: item.slug, title: item.label }
							: undefined
					)
				}}
			>
				<ComboboxInput
					id={name}
					name={name}
					placeholder='Search forms…'
					onBlur={handleBlur}
					aria-invalid={isInvalid}
				/>
				<ComboboxContent>
					<ComboboxEmpty>
						{options.length === 0 ? 'No forms exist yet.' : 'No matches found.'}
					</ComboboxEmpty>
					<ComboboxList>
						{options.map((option) => (
							<ComboboxItem key={option.value} value={option}>
								{option.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</FieldShell>
	)
}

/**
 * Embeds a `forms` document into a page's own `blocks` field — the
 * plugin's own public-facing piece. Only picks *which* form to show; the
 * actual rendering (fields, submit handling against
 * `POST /api/forms/:id/submit`) is a public-page concern — this admin
 * field just records the reference.
 */
function FormBlockFields({ form, path }: BlockFieldsProps) {
	const options = useFormOptions()

	return (
		<form.AppField name={`${path}.form`}>
			{() => <FormReferencePicker options={options} />}
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
