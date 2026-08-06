import { Badge } from '@baseconfig/ui/components/badge'
import { Button } from '@baseconfig/ui/components/button'
import { Checkbox } from '@baseconfig/ui/components/checkbox'
import { cn } from '@baseconfig/ui/lib/utils'
import { DataTable } from '@baseconfig/ui/tables'
import { IconMinus } from '@tabler/icons-react'
import { useLiveQuery } from '@tanstack/react-db'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { createId } from '../../../collections/id'
import type { CollectionConfig } from '../../../collections/types'
import {
	draftCollections,
	type ContentCollection,
	type DocumentStatus
} from '../../../db/collections'
import { AuthWidget } from '../../widgets/auth-widget'
import { RenderView } from '../render-view'

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

const DEFAULT_COLUMNS: NonNullable<
	NonNullable<CollectionConfig['admin']>['defaultColumns']
> = [
	{ key: 'title', label: 'Title' },
	{ key: 'slug', label: 'Slug' }
]

/**
 * Stable-sorts `rows` so every row sharing the same `groupBy` value ends up
 * adjacent, in the order that value first appeared, rows with no value for
 * it sort last. Doesn't touch column shape or add section headers, this is
 * ordering only (`CollectionConfig['groupBy']`'s own doc comment).
 */
function groupRowsBy(rows: TableRow[], key: string): TableRow[] {
	const keyOf = (row: TableRow) => {
		const value = row[key]
		const first = Array.isArray(value) ? value[0] : value
		return first === undefined || first === null || first === ''
			? null
			: String(first)
	}
	const order: string[] = []
	const seen = new Set<string>()
	for (const row of rows) {
		const k = keyOf(row)
		if (k !== null && !seen.has(k)) {
			seen.add(k)
			order.push(k)
		}
	}
	const rank = new Map(order.map((k, i) => [k, i]))
	return [...rows].sort((a, b) => {
		const ka = keyOf(a)
		const kb = keyOf(b)
		const ra =
			ka === null
				? Number.POSITIVE_INFINITY
				: (rank.get(ka) ?? Number.POSITIVE_INFINITY)
		const rb =
			kb === null
				? Number.POSITIVE_INFINITY
				: (rank.get(kb) ?? Number.POSITIVE_INFINITY)
		return ra - rb
	})
}

export function CollectionTable({
	config,
	collection,
	onOpen
}: CollectionTableProps) {
	// Gated behind a client mount *before* `useLiveQuery` is ever called:
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

	// `auth: true` collections (`users`) are real, server-backed accounts:
	// they never go through the local-first draft mechanism at all (no
	// `useDocument`, no `draftCollections` entry), so there's nothing to
	// merge in for them. `useLiveQuery` can't be called conditionally
	// (rules of hooks), so this always subscribes to the draft collection,
	// just never used below when `config.auth` is true.
	const draftCollection = draftCollections[config.slug]
	const { data: draftData } = useLiveQuery(draftCollection)

	// `auth: true` collections are backed by `queryCollectionOptions`, which
	// surfaces query failures via `collection.utils` rather than throwing:
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

	const remoteIds = new Set(data.map((row) => row.id))

	// A document drafted locally but never published has no row in the real
	// collection at all: without this, it simply never appears anywhere
	// once you navigate away from it, which is what made local-first editing
	// feel like it was silently forcing a publish. Only added when its `id`
	// has no remote counterpart; a row that exists in both keeps showing the
	// *remote* data below (what's actually live), not a possibly-newer local
	// edit, so the list doesn't visually shift under someone mid-edit in
	// another tab.
	const draftOnlyRows = config.auth
		? []
		: draftData.filter((row) => !remoteIds.has(row.id))

	const unsortedRows: TableRow[] = [...data, ...draftOnlyRows].map((row) => ({
		...(row.data as Record<string, unknown>),
		id: row.id,
		status: row.status,
		updatedAt: row.updatedAt
	}))
	const rows = config.admin?.groupBy
		? groupRowsBy(unsortedRows, config.admin.groupBy)
		: unsortedRows

	const dataColumns = config.admin?.defaultColumns ?? DEFAULT_COLUMNS
	const filterKey = config.admin?.filterKey ?? dataColumns[0]?.key

	// Purely navigational: no `collection.insert()` here. Generates a fresh
	// id and opens the editor for it; the document only becomes real once
	// the admin explicitly saves it (`useDocument`'s own doc comment covers
	// why: this used to insert a real blank row immediately on click).
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
						...(column.type === 'date'
							? { meta: { filterVariant: 'date' as const } }
							: {}),
						// A plain `value || '-'` fallback treats `false` the same as
						// "no value": wrong specifically for boolean-valued columns,
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
							if (Array.isArray(value)) {
								return value.length ? (
									value.join(', ')
								) : (
									<span className='text-muted-foreground'>-</span>
								)
							}
							return value || <span className='text-muted-foreground'>-</span>
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
						meta: { filterVariant: 'date' },
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
								onClick={() => {
									// A draft-only row (never published) has nothing to
									// delete remotely: deleting it just removes the local
									// draft instead, the same one-click cleanup a real row
									// already gets.
									if (remoteIds.has(row.original.id)) {
										collection.delete(row.original.id)
									} else {
										draftCollection.delete(row.original.id)
									}
								}}
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
