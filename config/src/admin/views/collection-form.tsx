import { slugify } from '../../collections/slug'
import type { CollectionConfig } from '../../collections/types'
import {
	draftCollections,
	publishKeywordPool,
	withBaseFields,
	type ContentCollection
} from '../../db/collections'
import { useDocument } from '../../db/use-document'
import { DocumentHeader } from './document-header'
import { Button } from '@base/ui/components/button'
import { t } from '@base/ui/components/sonner'
import { cn } from '@base/ui/lib/utils'
import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useRef, useState } from 'react'

type BaseData = { title: string; slug: string }

type CollectionFormProps = {
	config: CollectionConfig
	collection: ContentCollection
	id: string
}

/**
 * Shared by every explicit publish action ("Commit & push", "Publish") —
 * awaits the real write's `isPersisted` promise and toasts success/error,
 * so a network failure surfaces to the admin instead of silently vanishing.
 * This is the only place `useDocument`'s `publish()` ever gets called from
 * — editing itself never touches the network (see that hook's own doc
 * comment). Also flushes the local keyword-pool draft live right after —
 * see `publishKeywordPool()`'s own doc comment for why a document's publish
 * is what carries any newly-typed keywords live, not a separate step.
 */
async function runPublish(
	publish: (
		statusOverride?: 'draft' | 'published'
	) => { isPersisted: { promise: Promise<unknown> } } | undefined,
	statusOverride?: 'draft' | 'published'
) {
	try {
		await publish(statusOverride)?.isPersisted.promise
		await publishKeywordPool()
		t.success('Success', {
			description: statusOverride === 'published' ? 'Published.' : 'Saved.'
		})
	} catch (error) {
		t.error(error instanceof Error ? error.name : 'Error', {
			description: error instanceof Error ? error.message : String(error)
		})
	}
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
	// No existence check here anymore — a missing remote row isn't "not
	// found," it's a not-yet-published local draft (see `useDocument`'s own
	// doc comment, which calls `useLiveQuery` itself and re-renders once the
	// real row appears after the first `publish()`).
	//
	// `DocumentEditor` (and the `useAppForm` call inside it, via
	// `useDocument`) must not mount until BOTH collections have actually
	// finished their first read — `useAppForm` snapshots its `defaultValues`
	// once, at that first render, and never re-reads them later. Mounting
	// before either query resolves would snapshot empty/default field
	// values, which then never get replaced once the real data arrives —
	// this was the actual cause of a Base UI "uncontrolled → controlled"
	// warning (a field rendering with `value: undefined`, only for a later
	// render to hand it a real value) and of a document silently appearing
	// empty even though it has real remote data.
	const draftCollection = draftCollections[config.slug]
	const { isReady: remoteReady } = useLiveQuery(collection)
	const { isReady: draftReady } = useLiveQuery(draftCollection)

	if (!remoteReady || !draftReady) return null

	return (
		<DocumentEditor key={id} config={config} collection={collection} id={id} />
	)
}

function DocumentEditor({ config, collection, id }: CollectionFormProps) {
	const schema = withBaseFields(config.schema)
	const useAsTitle = config.admin?.useAsTitle
	const { form, row, publish, isDirty } = useDocument({
		collection,
		draftCollection: draftCollections[config.slug],
		id,
		schema,
		defaultValues: () =>
			({ title: '', slug: '', ...config.defaultValues() }) as BaseData &
				Record<string, unknown>
	})
	const slugTouched = useRef(!!(row.data as BaseData | undefined)?.slug)

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
							title={isDirty ? undefined : 'No changes to push'}
							onClick={() => runPublish(publish)}
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
								disabled={!isDirty}
								title={isDirty ? undefined : 'No changes to publish'}
								onClick={() => runPublish(publish, 'published')}
							>
								Publish
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
