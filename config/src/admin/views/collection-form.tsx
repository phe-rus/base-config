import { slugify } from '../../collections/slug'
import type { CollectionConfig } from '../../collections/types'
import { withBaseFields, type ContentCollection } from '../../db/collections'
import { useDocument } from '../../db/use-document'
import { DocumentHeader } from './document-header'
import { RenderView } from './render-view'
import { Button } from '@pherus/ui/components/button'
import { t } from '@pherus/ui/components/sonner'
import { cn } from '@pherus/ui/lib/utils'
import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useRef, useState } from 'react'

type BaseData = { title: string; slug: string }

type CollectionFormProps = {
	config: CollectionConfig
	collection: ContentCollection
	id: string
}

export function CollectionForm({
	config,
	collection,
	id
}: CollectionFormProps) {
	// Gated behind a client mount *before* `useLiveQuery` is ever called (not
	// just before its result is used) — `CollectionFormLive` below is the
	// only place that hook runs, and it's never rendered during SSR. Calling
	// `useLiveQuery` unconditionally at the top of this component crashed
	// during SSR (`useSyncExternalStore` needs a `getServerSnapshot` this
	// library doesn't provide).
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) return null

	return <CollectionFormLive config={config} collection={collection} id={id} />
}

function CollectionFormLive({ config, collection, id }: CollectionFormProps) {
	const { data } = useLiveQuery(collection)

	if (!data.some((row) => row.id === id)) {
		return (
			<RenderView.NotFound>
				Nothing found for "{id}" — it may have been deleted.
			</RenderView.NotFound>
		)
	}

	return (
		<DocumentEditor key={id} config={config} collection={collection} id={id} />
	)
}

function DocumentEditor({ config, collection, id }: CollectionFormProps) {
	const schema = withBaseFields(config.schema)
	const useAsTitle = config.admin?.useAsTitle
	const { form, row, save, isDirty } = useDocument({
		collection,
		id,
		schema,
		defaultValues: () =>
			({ title: '', slug: '', ...config.defaultValues() }) as BaseData &
				Record<string, unknown>,
		// A real backend collection (`auth: true`) shouldn't call its API on
		// every keystroke — see `useDocument`'s own `autoSave` doc comment.
		autoSave: !config.auth
	})
	const slugTouched = useRef(!!(row?.data as BaseData | undefined)?.slug)

	if (!row) return null

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
			}}
			className='flex flex-col gap-2 pb-5'
		>
			<DocumentHeader
				title={
					useAsTitle ? (
						// `useAsTitle`'s field is already a real, directly editable
						// field rendered by `config.Fields` below — this is a
						// read-only heading, not a second input for the same field.
						<h2 className='text-2xl font-bold'>
							{((row.data as Record<string, unknown>)[useAsTitle] as
								| string
								| undefined) || 'Untitled'}
						</h2>
					) : (
						<form.Field name='title'>
							{(f: any) => (
								<textarea
									id={f.name}
									name={f.name}
									value={f.state.value}
									placeholder='Untitled'
									onChange={(e) => {
										f.handleChange(e.target.value)
										if (!slugTouched.current) {
											form.setFieldValue('slug', slugify(e.target.value))
										}
									}}
									onBlur={f.handleBlur}
									className={cn(
										'flex bg-transparent border-0 outline-0',
										'text-2xl font-bold field-sizing-content',
										'min-w-12 resize-none whitespace-pre-wrap'
									)}
								/>
							)}
						</form.Field>
					)
				}
				status={row.status}
				createdAt={row.createdAt}
				updatedAt={row.updatedAt}
				actions={
					config.auth ? (
						<Button
							size='xs'
							variant='secondary'
							disabled={!isDirty}
							title={isDirty ? undefined : 'No changes to save'}
							onClick={async () => {
								try {
									await save()?.isPersisted.promise
									t.success('Success', {
										description: 'Changes saved.'
									})
								} catch (error) {
									t.error(error instanceof Error ? error.name : 'Error', {
										description:
											error instanceof Error ? error.message : String(error)
									})
								}
							}}
						>
							Commit & push
						</Button>
					) : (
						<>
							{row.status === 'published' && (
								<Button
									size='xs'
									variant='destructive'
									onClick={() => {
										collection.update(id, (draft) => {
											draft.status = 'draft'
										})
									}}
								>
									Unpublish
								</Button>
							)}
							<Button
								size='xs'
								variant='secondary'
								disabled={row.status === 'published'}
								title={
									row.status === 'published' ? 'Already published' : undefined
								}
								onClick={() => {
									collection.update(id, (draft) => {
										draft.status = 'published'
									})
								}}
							>
								Commit & publish
							</Button>
						</>
					)
				}
			/>

			<section className='container flex flex-col gap-2 w-full md:max-w-4xl mx-auto'>
				<div className='flex flex-col w-full md:max-w-lg mr-auto'>
					<config.Fields form={form} id={id} />
				</div>
			</section>
		</form>
	)
}
