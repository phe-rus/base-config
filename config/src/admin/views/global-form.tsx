import type { GlobalConfig, GlobalSlug } from '../../collections/types'
import { globalsCollection } from '../../db/collections'
import { useDocument } from '../../db/use-document'
import { DocumentHeader } from './document-header'
import { Button } from '@base/ui/components/button'
import { t } from '@base/ui/components/sonner'
import { useEffect, useState } from 'react'

type GlobalFormProps = {
	config: GlobalConfig
	id: GlobalSlug
}

export function GlobalForm({ config, id }: GlobalFormProps) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) return null

	return <GlobalEditor key={id} config={config} id={id} />
}

function GlobalEditor({ config, id }: GlobalFormProps) {
	const { form, row, save, isDirty } = useDocument({
		collection: globalsCollection,
		id,
		schema: config.schema,
		defaultValues: config.defaultValues,
		autoCreate: true
	})

	if (!row) return null

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
					<Button
						size='xs'
						variant='secondary'
						disabled={!isDirty}
						title={isDirty ? undefined : 'No changes to save'}
						onClick={async () => {
							try {
								await save()?.isPersisted.promise
								t.success('Success', { description: 'Changes saved.' })
							} catch (error) {
								t.error(error instanceof Error ? error.name : 'Error', {
									description:
										error instanceof Error ? error.message : String(error)
								})
							}
						}}
					>
						Save
					</Button>
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
