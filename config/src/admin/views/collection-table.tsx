import { Badge } from '@base/ui/components/badge'
import { Button } from '@base/ui/components/button'
import { Checkbox } from '@base/ui/components/checkbox'
import { cn } from '@base/ui/lib/utils'
import { DataTable } from '@base/ui/tables'
import { IconMinus } from '@tabler/icons-react'
import { useLiveQuery } from '@tanstack/react-db'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { createId } from '../../collections/id'
import type { CollectionConfig } from '../../collections/types'
import type { ContentCollection, DocumentStatus } from '../../db/collections'
import { AuthWidget } from '../widgets/auth-widget'
import { RenderView } from './render-view'

type CollectionTableProps = {
	config: CollectionConfig
	collection: ContentCollection
	onOpen: (id: string) => void
}

type TableRow = {
	id: string
	status: DocumentStatus
	updatedAt: string
	[key: string]: unknown
}

const DEFAULT_COLUMNS: NonNullable<CollectionConfig['columns']> = [
	{ key: 'title', label: 'Title' },
	{ key: 'slug', label: 'Slug' }
]

export function CollectionTable({
	config,
	collection,
	onOpen
}: CollectionTableProps) {
	// Gated behind a client mount *before* `useLiveQuery` is ever called —
	// `CollectionTableLive` below is the only place that hook runs, and it's
	// never rendered during SSR. Calling `useLiveQuery` unconditionally here
	// crashed during SSR (`useSyncExternalStore` needs a `getServerSnapshot`
	// this library doesn't provide).
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) {
		return (
			<RenderView>
				<RenderView.Header title={config.label} />
			</RenderView>
		)
	}

	return (
		<CollectionTableLive
			config={config}
			collection={collection}
			onOpen={onOpen}
		/>
	)
}

function CollectionTableLive({
	config,
	collection,
	onOpen
}: CollectionTableProps) {
	const { data } = useLiveQuery(collection)

	// `auth: true` collections are backed by `queryCollectionOptions`, which
	// surfaces query failures via `collection.utils` rather than throwing —
	// a failed `listUsers()` call would otherwise render as a silent, empty
	// table with no indication anything went wrong. `ContentCollection`'s own
	// type doesn't declare `.utils` (the `localStorage`-backed variant every
	// other collection uses has none), so this reads it loosely and only for
	// `auth` collections.
	const queryUtils = config.auth
		? (
				collection as unknown as {
					utils?: { isError?: boolean; lastError?: unknown }
				}
			).utils
		: undefined

	const rows: TableRow[] = data.map((row) => ({
		...(row.data as Record<string, unknown>),
		id: row.id,
		status: row.status,
		updatedAt: row.updatedAt
	}))

	const dataColumns = config.columns ?? DEFAULT_COLUMNS
	const filterKey = config.filterKey ?? dataColumns[0]?.key

	// Purely navigational — no `collection.insert()` here. Generates a fresh
	// id and opens the editor for it; the document only becomes real once
	// the admin explicitly saves it (`useDocument`'s own doc comment covers
	// why — this used to insert a real blank row immediately on click).
	const create = () => {
		onOpen(createId())
	}

	return (
		<RenderView>
			<RenderView.Header
				title={config.label}
				actions={() => {
					return config.auth ? (
						<AuthWidget collection={collection} onCreated={onOpen} />
					) : (
						<Button size='xs' variant='secondary' onClick={create}>
							Create new
						</Button>
					)
				}}
			/>
			{queryUtils?.isError && (
				<p className='text-destructive text-xs'>
					Failed to load: {String(queryUtils.lastError ?? 'unknown error')}
				</p>
			)}
			<DataTable<TableRow>
				data={rows}
				columns={[
					{
						id: 'selection',
						header: ({ table }) => (
							<Checkbox
								checked={
									table.getIsSomePageRowsSelected() ||
									table.getIsAllPageRowsSelected()
								}
								onCheckedChange={(value) =>
									table.toggleAllPageRowsSelected(!!value)
								}
								aria-label='Select all'
								className='rounded-none'
							/>
						),
						cell: ({ row }) => (
							<Checkbox
								checked={row.getIsSelected()}
								onCheckedChange={(value) => row.toggleSelected(!!value)}
								aria-label='Select row'
								className='rounded-none'
							/>
						)
					},
					{
						id: 'id',
						header: 'ID',
						cell: ({ row }) => (
							<Link
								to='/admin/$collection/$'
								params={{
									collection: config.slug,
									_splat: row.original.id
								}}
								className={cn(
									'text-[10px] text-primary-foreground',
									'bg-primary rounded px-2 py-0.5 hover:bg-primary/85'
								)}
							>
								{row.original.id}
							</Link>
						)
					},
					...dataColumns.map((column) => ({
						accessorKey: column.key,
						header: column.label,
						// A plain `value || '—'` fallback treats `false` the same as
						// "no value" — wrong specifically for boolean-valued columns,
						// where `false` is a real, meaningful value, not a blank.
						cell: ({ row }: { row: { original: TableRow } }) => {
							const value = row.original[column.key]
							if (column.type === 'checkbox' || column.type === 'switch') {
								return (
									<Badge
										className='rounded-none capitalize text-[8px]'
										variant={value ? 'secondary' : 'outline'}
									>
										{value ? 'True' : 'False'}
									</Badge>
								)
							}
							return value || <span className='text-muted-foreground'>—</span>
						}
					})),
					{
						accessorKey: 'status',
						header: 'Status',
						cell: ({ row }) => {
							const isPublished = row.original.status === 'published'

							return (
								<Badge
									className={cn('rounded-none capitalize text-[8px]')}
									variant={isPublished ? 'secondary' : 'outline'}
								>
									{row.original.status}
								</Badge>
							)
						}
					},
					{
						accessorKey: 'updatedAt',
						header: 'Updated',
						cell: ({ row }) => format(new Date(row.original.updatedAt), 'PPP')
					},
					{
						id: 'actions',
						cell: ({ row }) => (
							<Button
								type='button'
								title='Delete'
								size='icon-xs'
								variant='destructive'
								className='rounded-full'
								onClick={() => collection.delete(row.original.id)}
							>
								<IconMinus />
							</Button>
						)
					}
				]}
				filterKey={filterKey}
				filterPlaceholder={`Search ${config.label.toLowerCase()}…`}
			/>
		</RenderView>
	)
}
