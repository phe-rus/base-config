import type {
	BlockConfig,
	BlockFieldsProps,
	ContentDocumentRow
} from '@baseconfig/core'
import { base, getContentCollection } from '@baseconfig/core'
import { Button } from '@baseconfig/ui/components/button'
import { Checkbox } from '@baseconfig/ui/components/checkbox'
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '@baseconfig/ui/components/combobox'
import { Input } from '@baseconfig/ui/components/input'
import { Textarea } from '@baseconfig/ui/components/textarea'
import { FieldShell, useFieldState } from '@baseconfig/ui/forms'
import { IconForms } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { type FormEvent, useMemo, useState } from 'react'
import { z } from 'zod'
import type { FormData, FormFieldRow } from './forms-collection'

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
 * A small, self-contained picker rather than `@baseconfig/core`'s own shared
 * `RelationshipField` — that component's `targetType` is typed to *this
 * app's own* closed `CollectionSlug` union, which a plugin package can't
 * add `'forms'` to (see `@baseconfig/core`'s own `collections/types.ts` doc
 * history). `getContentCollection('forms')` is the plain-string-keyed
 * escape hatch built for exactly this (`@baseconfig/core`'s own barrel export).
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

/** Calls `useFieldState()` itself, same as `@baseconfig/ui/forms`'s own field components (`Input`, etc.) — the `form.AppField` render-prop below just renders this, rather than calling the hook inline. */
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
 * Embeds a `forms` document into a page's own `blocks` field — only picks
 * *which* form to show; the actual public rendering is `FormBlockRender`
 * below.
 */
function FormBlockFields({ form, path }: BlockFieldsProps) {
	const options = useFormOptions()

	return (
		<form.AppField name={`${path}.form`}>
			{() => <FormReferencePicker options={options} />}
		</form.AppField>
	)
}

type SubmitStatus = 'idle' | 'submitting' | 'submitted' | 'error'
type Confirmation = {
	type: 'message' | 'redirect'
	message?: string
	url?: string
}

/**
 * The plugin's own public-facing piece — a plain, uncontrolled-by-`useAppForm`
 * HTML form (there's no admin form context on a public page, unlike every
 * other field/block in this system), built from the referenced `forms`
 * document's own `fields` config and POSTing straight to
 * `formBuilderEndpoints`' own `POST /api/forms/:id/submit` (see
 * `endpoints.ts`) — plain `fetch`, not a typed RPC client, since that
 * endpoint is a Tier-2 `EndpointFactory` addition, never part of the
 * static `BaseConfigRouteType` a generated client could type against.
 */
function FormBlockRender({ data }: { data: Record<string, unknown> }) {
	const reference = data.form as
		| { id: string; slug: string; title: string }
		| undefined
	const { data: formDoc } = useQuery<ContentDocumentRow>({
		...base.findByID({ collection: 'forms', id: reference?.id ?? '' }),
		enabled: Boolean(reference?.id)
	})
	const [values, setValues] = useState<Record<string, unknown>>({})
	const [status, setStatus] = useState<SubmitStatus>('idle')
	const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	if (!reference) return null

	const fields = ((formDoc?.data as FormData | undefined)?.fields ??
		[]) as FormFieldRow[]

	function setValue(name: string, value: unknown) {
		setValues((current) => ({ ...current, [name]: value }))
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!reference) return
		setStatus('submitting')
		setErrorMessage(null)
		try {
			const res = await fetch(`/api/forms/${reference.id}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values)
			})
			const body = (await res.json()) as {
				error?: string
				confirmation?: Confirmation
			}
			if (!res.ok) {
				setStatus('error')
				setErrorMessage(body.error ?? 'Something went wrong.')
				return
			}
			if (body.confirmation?.type === 'redirect' && body.confirmation.url) {
				window.location.href = body.confirmation.url
				return
			}
			setConfirmation(body.confirmation ?? null)
			setStatus('submitted')
		} catch {
			setStatus('error')
			setErrorMessage('Something went wrong.')
		}
	}

	if (status === 'submitted' && confirmation?.type === 'message') {
		return <p>{confirmation.message}</p>
	}

	if (!formDoc) return null

	return (
		<form onSubmit={handleSubmit} className='flex max-w-md flex-col gap-4'>
			{fields.map((field) => (
				<div key={field.name} className='flex flex-col gap-1.5'>
					<label htmlFor={field.name} className='text-sm font-medium'>
						{field.label}
						{field.required ? ' *' : ''}
					</label>
					{field.type === 'textarea' ? (
						<Textarea
							id={field.name}
							required={field.required}
							value={(values[field.name] as string) ?? ''}
							onChange={(event) => setValue(field.name, event.target.value)}
						/>
					) : field.type === 'checkbox' ? (
						<Checkbox
							id={field.name}
							checked={Boolean(values[field.name])}
							onCheckedChange={(checked) =>
								setValue(field.name, checked === true)
							}
						/>
					) : field.type === 'select' ? (
						<select
							id={field.name}
							required={field.required}
							className='h-7 rounded-md border border-input bg-input/20 px-2 text-sm'
							value={(values[field.name] as string) ?? ''}
							onChange={(event) => setValue(field.name, event.target.value)}
						>
							<option value='' disabled>
								Select…
							</option>
							{(field.options ?? '')
								.split(',')
								.map((option) => option.trim())
								.filter(Boolean)
								.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
						</select>
					) : (
						<Input
							id={field.name}
							type={field.type === 'email' ? 'email' : 'text'}
							required={field.required}
							value={(values[field.name] as string) ?? ''}
							onChange={(event) => setValue(field.name, event.target.value)}
						/>
					)}
				</div>
			))}
			{errorMessage ? (
				<p className='text-sm text-destructive'>{errorMessage}</p>
			) : null}
			<Button type='submit' disabled={status === 'submitting'}>
				{status === 'submitting' ? 'Sending…' : 'Submit'}
			</Button>
		</form>
	)
}

export const formBlock: BlockConfig = {
	slug: 'form',
	label: 'Form',
	schema: formBlockSchema,
	defaultValue: {
		form: undefined
	},
	Fields: FormBlockFields,
	Render: FormBlockRender,
	Icon: IconForms
}
