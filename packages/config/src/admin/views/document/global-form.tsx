import { Button } from '@baseconfig/ui/components/button'
import { t } from '@baseconfig/ui/components/sonner'
import { cn } from '@baseconfig/ui/lib/utils'
import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useState } from 'react'
import type { GlobalConfig, GlobalSlug } from '../../../collections/types'
import {
	draftGlobalsCollection,
	globalsCollection,
	pruneGlobal
} from '../../../db/collections'
import { useDocument } from '../../../db/use-document'
import { expandFields, knownFieldPaths } from '../../../fields/schema'
import { DocumentHeader } from './document-header'

type GlobalFormProps = {
	config: GlobalConfig
	id: GlobalSlug
}

export function GlobalForm({ config, id }: GlobalFormProps) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) return null

	return <GlobalFormLive config={config} id={id} />
}

/**
 * Same reasoning as `CollectionForm`'s own `CollectionFormLive` gate: don't
 * mount `GlobalEditor` (and the `useAppForm` call inside it, via
 * `useDocument`) until both the remote and local-draft queries have
 * actually resolved: `useAppForm` only snapshots its `defaultValues` once,
 * at first render, so mounting too early would freeze fields at
 * empty/default values that then never get replaced, and can flip a field
 * from an uncontrolled `undefined` to a real value on a later render (a
 * real Base UI warning this fixes).
 */
function GlobalFormLive({ config, id }: GlobalFormProps) {
	const { isReady: remoteReady } = useLiveQuery(globalsCollection)
	const { isReady: draftReady } = useLiveQuery(draftGlobalsCollection)

	if (!remoteReady || !draftReady) return null

	return <GlobalEditor key={id} config={config} id={id} />
}

function GlobalEditor({ config, id }: GlobalFormProps) {
	// Globals have no draft/published status distinction: `publish()` is
	// still the one and only action that ever reaches the real
	// `/api/globals/<slug>` backend, edits themselves stay purely local
	// (see `useDocument`'s own doc comment).
	const { form, row, publish, isDirty, hasRemoteRow } = useDocument({
		collection: globalsCollection,
		draftCollection: draftGlobalsCollection,
		id,
		schema: config.schema,
		defaultValues: config.defaultValues,
		knownFieldPaths: knownFieldPaths(expandFields(config.fields ?? []))
	})

	return (
		<form
			onSubmit={(e) => e.preventDefault()}
			className='flex flex-col gap-2 pb-5'
		>
			<DocumentHeader
				title={<h1 className='text-2xl font-bold'>{config.label}</h1>}
				status={row.status}
				createdAt={row.createdAt}
				updatedAt={row.updatedAt}
				actions={
					<>
						{hasRemoteRow && (
							<Button
								size='xs'
								variant='outline'
								title="Reconcile this global's stored data with the current schema, dropping any field that's since been renamed or removed"
								onClick={async () => {
									try {
										await pruneGlobal(config)
										t.success('Success', { description: 'Pruned.' })
									} catch (error) {
										t.error(error instanceof Error ? error.name : 'Error', {
											description:
												error instanceof Error ? error.message : String(error)
										})
									}
								}}
							>
								Prune
							</Button>
						)}
						<Button
							size='xs'
							variant='secondary'
							disabled={!isDirty}
							title={isDirty ? undefined : 'No changes to publish'}
							onClick={async () => {
								try {
									await publish()?.isPersisted.promise
									t.success('Success', { description: 'Published.' })
								} catch (error) {
									t.error(error instanceof Error ? error.name : 'Error', {
										description:
											error instanceof Error ? error.message : String(error)
									})
								}
							}}
						>
							Publish
						</Button>
					</>
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
