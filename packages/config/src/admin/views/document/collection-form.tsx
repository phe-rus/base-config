import { Button } from '@baseconfig/ui/components/button'
import { t } from '@baseconfig/ui/components/sonner'
import { cn } from '@baseconfig/ui/lib/utils'
import { useLiveQuery } from '@tanstack/react-db'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { slugify } from '../../../collections/slug'
import type { CollectionConfig } from '../../../collections/types'
import {
	draftCollections,
	pruneDocument,
	publishKeywordPool,
	withBaseFields,
	type ContentCollection
} from '../../../db/collections'
import { useDocument } from '../../../db/use-document'
import { flattenTabFields, knownFieldPaths } from '../../../fields/schema'
import { useAdminConfig } from '../../functions/context'
import { DocumentHeader } from './document-header'

type BaseData = { title: string; slug: string }

type CollectionFormProps = {
	config: CollectionConfig
	collection: ContentCollection
	id: string
}

/**
 * Shared by every explicit publish action ("Commit & push", "Publish"):
 * awaits the real write's `isPersisted` promise and toasts success/error,
 * so a network failure surfaces to the admin instead of silently vanishing.
 * This is the only place `useDocument`'s `publish()` ever gets called from,
 * editing itself never touches the network (see that hook's own doc
 * comment). Also flushes the local keyword-pool draft live right after:
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

/**
 * The one explicit "Prune" action (see `db/prune.ts`'s own doc comment):
 * reconciles this document's *remote* stored data down to only the
 * collection's current real fields, dropping anything left over from a
 * field that's since been renamed/removed from config. Deliberately
 * separate from `runPublish` above, an ordinary publish never touches
 * structure this way (see that file's own doc comment for why this is a
 * distinct action rather than something Publish does automatically).
 */
async function runPrune(config: CollectionConfig, id: string) {
	try {
		await pruneDocument(config, id)
		t.success('Success', { description: 'Pruned.' })
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
	// just before its result is used), `CollectionFormLive` below is the
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
	// No existence check here anymore: a missing remote row isn't "not
	// found," it's a not-yet-published local draft (see `useDocument`'s own
	// doc comment, which calls `useLiveQuery` itself and re-renders once the
	// real row appears after the first `publish()`).
	//
	// `DocumentEditor` (and the `useAppForm` call inside it, via
	// `useDocument`) must not mount until BOTH collections have actually
	// finished their first read: `useAppForm` snapshots its `defaultValues`
	// once, at that first render, and never re-reads them later. Mounting
	// before either query resolves would snapshot empty/default field
	// values, which then never get replaced once the real data arrives,
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
	// Not computed for `auth: true` collections: a real user document's
	// `data` can carry a consumer's own `additionalFields` (see
	// `RealUserRow`'s own doc comment, `db/collections.ts`) that aren't
	// necessarily declared in `config.tabs`, and pruning doesn't apply to
	// `users` at all (no JSON blob, no "Prune" button, see below), so
	// there's nothing to gain and a real risk of stripping legitimate data
	// from the edit form if this ran for that collection too.
	const documentKnownFieldPaths = config.auth
		? undefined
		: ['title', 'slug', ...knownFieldPaths(flattenTabFields(config.tabs ?? []))]
	const { form, row, publish, isDirty, hasRemoteRow } = useDocument({
		collection,
		draftCollection: draftCollections[config.slug],
		id,
		schema,
		defaultValues: () =>
			({ title: '', slug: '', ...config.defaultValues() }) as BaseData &
				Record<string, unknown>,
		knownFieldPaths: documentKnownFieldPaths
	})
	const slugTouched = useRef(!!(row.data as BaseData | undefined)?.slug)
	const { adminPath } = useAdminConfig()
	const navigate = useNavigate()

	// "Publish" is for a document going live for the first time; "Update" is
	// for pushing an edit to a document that's already live: same button,
	// same `publish('published')` call underneath (the write itself doesn't
	// care which label was showing), just a label that actually matches
	// what's about to happen instead of always saying "Publish."
	const alreadyPublished = hasRemoteRow && row.status === 'published'

	// No remote row at all: nothing was ever published, so there's nothing
	// to revert *to*: the only sensible action is deleting the local draft
	// and leaving. A remote row exists but this browser's draft differs:
	// revert the draft back to what's actually live. `useAppForm` snapshots
	// `defaultValues` once at mount and never re-reads them, so resetting
	// the draft's own `localStorage` data alone wouldn't update the
	// already-rendered fields: `reloadDocument: true` forces a clean
	// remount that re-seeds from the now-reverted draft, same pattern
	// sign-in/sign-out already use elsewhere for exactly this class of
	// "state changed out from under the router" problem.
	const discardDraft = () => {
		if (!hasRemoteRow) {
			draftCollections[config.slug].delete(id)
			navigate({ to: `/${adminPath}/${config.slug}` as any, replace: true })
			return
		}
		draftCollections[config.slug].update(id, (draft) => {
			draft.data = row.data
			draft.updatedAt = new Date().toISOString()
		})
		navigate({
			to: `/${adminPath}/${config.slug}/${id}` as any,
			replace: true,
			reloadDocument: true
		})
	}

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
						// field rendered by `config.Fields` below: this is a
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
						<>
							{isDirty && (
								<Button size='xs' variant='outline' onClick={discardDraft}>
									{hasRemoteRow ? 'Revert changes' : 'Discard draft'}
								</Button>
							)}
							<Button
								size='xs'
								variant='secondary'
								disabled={!isDirty}
								title={isDirty ? undefined : 'No changes to push'}
								onClick={() => runPublish(publish)}
							>
								Commit & push
							</Button>
						</>
					) : (
						<>
							{isDirty && (
								<Button size='xs' variant='outline' onClick={discardDraft}>
									{hasRemoteRow ? 'Revert changes' : 'Discard draft'}
								</Button>
							)}
							{hasRemoteRow && (
								<Button
									size='xs'
									variant='outline'
									title="Reconcile this document's stored data with the current schema, dropping any field that's since been renamed or removed"
									onClick={() => runPrune(config, id)}
								>
									Prune
								</Button>
							)}
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
								title={
									isDirty
										? undefined
										: `No changes to ${alreadyPublished ? 'update' : 'publish'}`
								}
								onClick={() => runPublish(publish, 'published')}
							>
								{alreadyPublished ? 'Update' : 'Publish'}
							</Button>
						</>
					)
				}
			/>

			<section className='container flex flex-col gap-2 w-full md:max-w-4xl mx-auto'>
				<div className={cn('flex flex-col w-full mr-auto md:max-w-lg')}>
					<config.Fields form={form} id={id} />
				</div>
			</section>
		</form>
	)
}
