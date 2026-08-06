import { Badge } from '../components/badge'
import { Button } from '../components/button'
import { Checkbox } from '../components/checkbox'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '../components/input-group'
import { cn } from '../lib/utils'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '../components/table'
import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_arrIncludesSome,
	filterFn_inDateRange,
	filterFns,
	flexRender,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
	useTable,
	type Column,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnVisibilityState,
	type RowData,
	type RowSelectionState,
	type SortingState
} from '@tanstack/react-table'
import {
	IconChevronDown,
	IconChevronUp,
	IconSearch,
	IconX
} from '@tabler/icons-react'
import { useMemo, useState, type ReactNode } from 'react'
import { DataTablePagination } from './pagination'

/**
 * `filterVariant: 'date'` is the one thing a caller has to opt into
 * explicitly (`updatedAt`/`createdAt`, or a custom `type: 'date'` column):
 * unlike an array-valued column (detected automatically below, from the
 * actual data), a date is just a string or number at runtime, nothing to
 * sniff it from safely.
 */
export type DataTableColumnMeta = {
	filterVariant?: 'date'
}

export type DataTableColumnDef<
	TData extends RowData,
	TValue = unknown
> = ColumnDef<DataTableFeatures, TData, TValue> & { meta?: DataTableColumnMeta }

const features = tableFeatures({
	columnFilteringFeature,
	rowSortingFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns,
	sortFns
})

export type DataTableFeatures = typeof features

type DataTableProps<TData extends RowData> = {
	data: TData[]
	columns: DataTableColumnDef<TData, unknown>[]
	/** Column id to search on - also gates the Columns/Filters toolbar. */
	filterKey?: string
	filterPlaceholder?: string
	empty?: ReactNode
	bulkActions?: (selectedRows: TData[], clearSelection: () => void) => ReactNode
	/** Set false to render just the table, e.g. when paging externally. Default true. */
	pagination?: boolean
	pageSizeOptions?: number[]
	onSelectedRowsChange?: (rows: TData[]) => void
}

/** Whether any row actually holds an array for this column, e.g. a `keywords` field like `category`, checked against real data rather than requiring a caller to declare it. */
function isArrayValuedColumn<TData>(data: TData[], colId: string): boolean {
	return data.some((row) =>
		Array.isArray((row as Record<string, unknown>)[colId])
	)
}

/**
 * The quick-filter checkbox list's own candidate values. For a plain scalar
 * column, one value per distinct cell, same as before. For an array-valued
 * column (`isArrayColumn`), the individual *items* across every row's array
 * are what should show up as checkboxes, `category: ['fields']` contributes
 * `'fields'`, not the array itself, an array would never equal any of the
 * scalar comparisons the checkbox click handler does, and would previously
 * get excluded outright anyway (`typeof [] === 'object'`, which is exactly
 * why a `category` column's filter used to silently show nothing).
 */
function useQuickFilterValues<TData>(
	data: TData[],
	colId: string,
	exclude: string[],
	isArrayColumn: boolean
) {
	return useMemo(() => {
		if (exclude.includes(colId)) return []
		if (isArrayColumn) {
			const flattened = data.flatMap((row) => {
				const value = (row as Record<string, unknown>)[colId]
				return Array.isArray(value) ? value : []
			})
			const unique = [
				...new Set(
					flattened.filter((v) => v !== null && v !== undefined && v !== '')
				)
			]
			if (unique.length < 2 || unique.length > 20) return []
			return unique.map((v) => String(v))
		}
		const raw = data.map((row) => (row as Record<string, unknown>)[colId])
		const unique = [
			...new Set(
				raw.filter(
					(v) =>
						v !== null && v !== undefined && v !== '' && typeof v !== 'object'
				)
			)
		]
		if (unique.length < 2 || unique.length > 12) return []
		return unique.map((v) => String(v))
	}, [data, colId, exclude, isArrayColumn])
}

function columnIdOf<TData extends RowData>(
	col: DataTableColumnDef<TData>
): string | undefined {
	if ('id' in col && col.id) return col.id
	if ('accessorKey' in col && typeof col.accessorKey === 'string') {
		return col.accessorKey
	}
	return undefined
}

function getColumnLabel(column: {
	columnDef: { header?: unknown }
	id: string
}) {
	const header = column.columnDef.header
	if (typeof header === 'string') return header
	return column.id
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (s) => s.toUpperCase())
}

/**
 * Self-contained table: pass `data` + `columns`, get sorting, pagination,
 * and - once `filterKey` is set - search, column visibility, per-column
 * filters, and row selection for free. There's no `useReactTable`/state to
 * wire up on the caller's side, and no separate column-header component:
 * any column with `accessorKey` gets a sort affordance automatically off
 * whatever you pass as `header` (a plain string is fine).
 */
export function DataTable<TData extends RowData>({
	data,
	columns,
	filterKey,
	filterPlaceholder = 'Filter…',
	empty = 'No results.',
	bulkActions,
	pagination = true,
	pageSizeOptions,
	onSelectedRowsChange
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] =
		useState<ColumnVisibilityState>({})
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [columnsOpen, setColumnsOpen] = useState(false)
	const [filtersOpen, setFiltersOpen] = useState(false)

	// A caller's own explicit `filterFn` always wins. Otherwise: a column
	// marked `meta.filterVariant: 'date'` gets real date-range matching
	// (`filterFn_inDateRange`, min/max, not a scalar comparison); a column
	// whose actual data is array-valued (`category`, any `keywords` field)
	// gets array-contains matching (`filterFn_arrIncludesSome`), the default
	// `includesString` behavior would otherwise stringify the whole array
	// (`['fields'].toString()`) and only work by accident for a single-item
	// array.
	const augmentedColumns = useMemo(
		() =>
			columns.map((col) => {
				if (col.filterFn) return col
				const colId = columnIdOf(col)
				if (!colId) return col
				if (col.meta?.filterVariant === 'date') {
					return { ...col, filterFn: filterFn_inDateRange }
				}
				if (isArrayValuedColumn(data, colId)) {
					return { ...col, filterFn: filterFn_arrIncludesSome }
				}
				return col
			}),
		[columns, data]
	)

	const table = useTable({
		features,
		data,
		columns: augmentedColumns,
		enableRowSelection: true,
		state: { sorting, columnFilters, columnVisibility, rowSelection },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection
	})

	const toggleableColumns = table.getAllColumns().filter((c) => c.getCanHide())
	const hiddenCount = toggleableColumns.filter((c) => !c.getIsVisible()).length

	const skip = ['select', 'actions', filterKey ?? '']
	const filterableColumns = table
		.getAllColumns()
		.filter(
			(c) =>
				c.getCanFilter() && !skip.includes(c.id) && c.accessorFn !== undefined
		)

	const activeFilterCount = columnFilters.filter(
		(f) => f.id !== filterKey
	).length
	const selectedCount = Object.values(rowSelection).filter(Boolean).length
	const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)
	const clearSelection = () => setRowSelection({})

	const rows = table.getRowModel().rows
	const columnCount = table.getVisibleLeafColumns().length

	return (
		<div className='flex flex-col gap-1 [&_div]:no-scrollbar [&_tr]:border-none!'>
			{filterKey && (
				<>
					<div className='relative flex items-center'>
						<InputGroup className='max-w-full py-4.25 rounded-none! overflow-hidden!'>
							<InputGroupInput
								placeholder={filterPlaceholder}
								value={
									(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''
								}
								onChange={(e) =>
									table
										.getColumn(filterKey)
										?.setFilterValue(e.target.value || undefined)
								}
							/>
							<InputGroupAddon align='inline-start'>
								<IconSearch className='dualTone' />
							</InputGroupAddon>
							<InputGroupAddon align='inline-end'>
								<Button
									className='rounded'
									variant={columnsOpen ? 'default' : 'secondary'}
									onClick={() => {
										setColumnsOpen((o) => !o)
										setFiltersOpen(false)
									}}
								>
									Columns
									{hiddenCount > 0 && (
										<Badge
											variant='destructive'
											className='ml-0.5 size-4 p-0 text-[9px] tabular-nums'
										>
											{hiddenCount}
										</Badge>
									)}
									<IconChevronDown
										className={cn(
											'dualTone transition-transform duration-150',
											columnsOpen && 'rotate-180'
										)}
									/>
								</Button>
								<Button
									className='rounded'
									variant={
										activeFilterCount > 0 || filtersOpen
											? 'default'
											: 'secondary'
									}
									onClick={() => {
										setFiltersOpen((o) => !o)
										setColumnsOpen(false)
									}}
								>
									Filters
									{activeFilterCount > 0 && (
										<Badge
											variant='destructive'
											className='ml-0.5 size-4 p-0 text-[9px] tabular-nums'
										>
											{activeFilterCount}
										</Badge>
									)}
									<IconChevronDown
										className={cn(
											'dualTone transition-transform duration-150',
											filtersOpen && 'rotate-180'
										)}
									/>
								</Button>
							</InputGroupAddon>
						</InputGroup>
					</div>

					{columnsOpen && (
						<div
							className={cn(
								'flex flex-col gap-2 border border-dashed',
								'border-input/30 bg-input/15 p-5',
								'rounded'
							)}
						>
							<div className='flex items-center justify-between'>
								<h3 className='text-xs!'>Columns</h3>
								{hiddenCount > 0 && (
									<Button
										variant='ghost'
										size='xs'
										onClick={() => table.resetColumnVisibility()}
										className='text-muted-foreground hover:text-foreground'
									>
										Show all
									</Button>
								)}
							</div>
							<div className='flex flex-wrap items-center gap-5'>
								{toggleableColumns.map((column) => {
									const visible = column.getIsVisible()
									return (
										<div
											key={column.id}
											className={cn(
												'flex items-center gap-2 transition-colors',
												'cursor-pointer'
											)}
											onClick={() => column.toggleVisibility()}
										>
											<Checkbox
												checked={visible}
												onCheckedChange={() => column.toggleVisibility()}
												className='size-3.5! pointer-events-none'
											/>
											<span className='text-xs!'>{getColumnLabel(column)}</span>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{filtersOpen && (
						<div
							className={cn(
								'flex flex-col gap-2 border border-dashed',
								'border-input/30 bg-input/15 p-5',
								'rounded'
							)}
						>
							<div className='flex items-center justify-between'>
								<h3 className='text-xs!'>Filters</h3>
								{activeFilterCount > 0 && (
									<Button
										variant='ghost'
										size='xs'
										onClick={() =>
											setColumnFilters((prev) =>
												prev.filter((f) => f.id === filterKey)
											)
										}
										className='text-muted-foreground hover:text-foreground'
									>
										<IconX className='size-3' />
										Clear all
									</Button>
								)}
							</div>

							{filterableColumns.length === 0 ? (
								<p className='text-xs text-muted-foreground/60'>
									No filterable columns.
								</p>
							) : (
								<div className='flex flex-col gap-3'>
									{filterableColumns.map((column) => (
										<FilterRow
											key={column.id}
											column={column}
											data={data}
											skip={skip}
											isArrayColumn={isArrayValuedColumn(data, column.id)}
											isDateColumn={
												(column.columnDef as { meta?: DataTableColumnMeta })
													.meta?.filterVariant === 'date'
											}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</>
			)}

			{bulkActions && selectedCount > 0 && (
				<div className='flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5'>
					<span className='text-sm font-medium'>{selectedCount} selected</span>
					<div className='h-4 w-px bg-input/40' />
					{bulkActions(selectedRows, clearSelection)}
					<Button
						variant='ghost'
						size='xs'
						onClick={clearSelection}
						className='ml-auto text-muted-foreground hover:text-foreground'
					>
						Clear
					</Button>
				</div>
			)}

			<div className='relative overflow-hidden'>
				<Table className='divide-none!'>
					<TableHeader className='border-none!'>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className='hover:bg-transparent'>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder ? null : header.column.getCanSort() ? (
											<div
												className={cn(
													'flex items-center gap-1 transition-colors',
													'text-muted-foreground hover:text-foreground',
													'cursor-pointer'
												)}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												<div
													className='flex items-center gap-1'
													onClick={header.column.getToggleSortingHandler()}
												>
													<IconChevronUp
														className={cn(
															'size-3 opacity-20',
															header.column.getIsSorted() === 'asc' &&
																'opacity-100'
														)}
													/>
													<IconChevronDown
														className={cn(
															'size-3 opacity-20',
															header.column.getIsSorted() === 'desc' &&
																'opacity-100'
														)}
													/>
												</div>
											</div>
										) : (
											flexRender(
												header.column.columnDef.header,
												header.getContext()
											)
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className='divide-none!'>
						{rows.length ? (
							rows.map((row) => (
								<TableRow
									key={row.id}
									className={cn(
										'cursor-pointer border-none! h-11',
										row.index % 2 === 0
											? 'bg-card/35 backdrop-blur'
											: 'bg-card/5 backdrop-blur',
										'hover:bg-cyan-300/5',
										'data-[state=selected]:bg-cyan-400/10',
										'data-[state=selected]:hover:bg-cyan-400/5'
									)}
									onClick={() => {
										row.toggleSelected()
										if (onSelectedRowsChange) {
											onSelectedRowsChange(selectedRows)
										}
									}}
									data-state={row.getIsSelected() ? 'selected' : undefined}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columnCount}>{empty}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{pagination && (
				<DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
			)}
		</div>
	)
}

function FilterRow<TData extends RowData>({
	column,
	data,
	skip,
	isArrayColumn,
	isDateColumn
}: {
	column: Column<DataTableFeatures, TData, unknown>
	data: TData[]
	skip: string[]
	isArrayColumn: boolean
	isDateColumn: boolean
}) {
	const uniqueValues = useQuickFilterValues(
		data,
		column.id,
		skip,
		isArrayColumn
	)
	const label = getColumnLabel(column)

	// A date column never gets the enumerated-values treatment below, every
	// row realistically has its own distinct timestamp, a checkbox per value
	// would just be a very long list of dates nobody can use, a from/to
	// range is what's actually useful (`filterFn_inDateRange`, the `DataTable`
	// component's own augmentation step).
	if (isDateColumn) {
		const [from, to] =
			(column.getFilterValue() as [string?, string?] | undefined) ?? []
		return (
			<div className='flex items-center gap-3'>
				<span className='w-20 shrink-0 text-[11px] font-medium text-muted-foreground'>
					{label}
				</span>
				<div className='flex items-center gap-2'>
					<input
						type='date'
						value={from ?? ''}
						onChange={(e) =>
							column.setFilterValue([e.target.value || undefined, to])
						}
						className='h-7 rounded-lg border border-dashed border-input/40 bg-background px-2 text-xs focus:outline-none'
					/>
					<span className='text-[11px] text-muted-foreground'>to</span>
					<input
						type='date'
						value={to ?? ''}
						onChange={(e) =>
							column.setFilterValue([from, e.target.value || undefined])
						}
						className='h-7 rounded-lg border border-dashed border-input/40 bg-background px-2 text-xs focus:outline-none'
					/>
					{(from || to) && (
						<Button
							variant='ghost'
							size='icon-xs'
							onClick={() => column.setFilterValue(undefined)}
							className='text-muted-foreground hover:text-foreground'
						>
							<IconX className='size-3' />
						</Button>
					)}
				</div>
			</div>
		)
	}

	// `activeFilter` is a bare value for a plain scalar column, or a
	// one-element array for an array-valued column (`filterFn_arrIncludesSome`
	// needs an array of values to check for overlap, even when only one is
	// ever picked here).
	const activeFilter = column.getFilterValue() as string | string[] | undefined
	const activeValue = isArrayColumn
		? Array.isArray(activeFilter)
			? activeFilter[0]
			: undefined
		: (activeFilter as string | undefined)

	if (uniqueValues.length > 0) {
		return (
			<div className='flex flex-col gap-1'>
				<span className='text-xs!'>{label}</span>
				<div className='flex flex-wrap items-center gap-2'>
					{uniqueValues.map((value) => {
						const active = activeValue === value
						const setActive = () =>
							column.setFilterValue(
								active ? undefined : isArrayColumn ? [value] : value
							)
						return (
							<div
								key={value}
								className={cn(
									'flex items-center gap-2 transition-colors',
									'cursor-pointer'
								)}
								onClick={setActive}
							>
								<Checkbox
									checked={active}
									onCheckedChange={setActive}
									className='size-3! pointer-events-none'
								/>
								<span className='text-xs!'>{value}</span>
							</div>
						)
					})}
					{activeValue && (
						<Button
							variant='ghost'
							size='xs'
							onClick={() => column.setFilterValue(undefined)}
							className='text-muted-foreground hover:text-foreground'
						>
							<IconX className='size-3' />
							Clear
						</Button>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className='flex items-center gap-3'>
			<span className='w-20 shrink-0 text-[11px] font-medium text-muted-foreground capitalize'>
				{label}
			</span>
			<div className='relative flex-1 max-w-xs'>
				<input
					type='text'
					placeholder={`Filter ${label.toLowerCase()}…`}
					value={activeValue ?? ''}
					onChange={(e) =>
						column.setFilterValue(
							e.target.value
								? isArrayColumn
									? [e.target.value]
									: e.target.value
								: undefined
						)
					}
					className='h-7 w-full rounded-lg border border-dashed border-input/40 bg-background px-2.5 text-xs placeholder:text-muted-foreground/40 focus:outline-none'
				/>
				{activeValue && (
					<Button
						variant='ghost'
						size='icon-xs'
						onClick={() => column.setFilterValue(undefined)}
						className='absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
					>
						<IconX className='size-3' />
					</Button>
				)}
			</div>
		</div>
	)
}
