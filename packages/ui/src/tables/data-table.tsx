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
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type Column,
	type ColumnDef,
	type ColumnFiltersState,
	type RowSelectionState,
	type SortingState,
	type VisibilityState
} from '@tanstack/react-table'
import {
	IconChevronDown,
	IconChevronUp,
	IconSearch,
	IconX
} from '@tabler/icons-react'
import { useMemo, useState, type ReactNode } from 'react'
import { DataTablePagination } from './pagination'

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<
	TData,
	TValue
>

type DataTableProps<TData> = {
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

function useQuickFilterValues<TData>(
	data: TData[],
	colId: string,
	exclude: string[]
) {
	return useMemo(() => {
		if (exclude.includes(colId)) return []
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
	}, [data, colId, exclude])
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
export function DataTable<TData>({
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
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [columnsOpen, setColumnsOpen] = useState(false)
	const [filtersOpen, setFiltersOpen] = useState(false)

	const table = useReactTable({
		data,
		columns,
		enableRowSelection: true,
		state: { sorting, columnFilters, columnVisibility, rowSelection },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
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
									<button
										type='button'
										onClick={() => table.resetColumnVisibility()}
										className='text-[11px] text-muted-foreground hover:text-foreground transition-colors'
									>
										Show all
									</button>
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
									<button
										type='button'
										onClick={() =>
											setColumnFilters((prev) =>
												prev.filter((f) => f.id === filterKey)
											)
										}
										className='flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors'
									>
										<IconX className='size-3' />
										Clear all
									</button>
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
					<button
						type='button'
						onClick={clearSelection}
						className='ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors'
					>
						Clear
					</button>
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

function FilterRow<TData>({
	column,
	data,
	skip
}: {
	column: Column<TData, unknown>
	data: TData[]
	skip: string[]
}) {
	const uniqueValues = useQuickFilterValues(data, column.id, skip)
	const activeFilter = column.getFilterValue() as string | undefined
	const label = getColumnLabel(column)

	if (uniqueValues.length > 0) {
		return (
			<div className='flex flex-col gap-1'>
				<span className='text-xs!'>{label}</span>
				<div className='flex flex-wrap items-center gap-2'>
					{uniqueValues.map((value) => {
						const active = activeFilter === value
						return (
							<div
								key={value}
								className={cn(
									'flex items-center gap-2 transition-colors',
									'cursor-pointer'
								)}
								onClick={() =>
									column.setFilterValue(active ? undefined : value)
								}
							>
								<Checkbox
									checked={active}
									onCheckedChange={() =>
										column.setFilterValue(active ? undefined : value)
									}
									className='size-3! pointer-events-none'
								/>
								<span className='text-xs!'>{value}</span>
							</div>
						)
					})}
					{activeFilter && (
						<button
							type='button'
							onClick={() => column.setFilterValue(undefined)}
							className='flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors'
						>
							<IconX className='size-3' />
							Clear
						</button>
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
					value={activeFilter ?? ''}
					onChange={(e) => column.setFilterValue(e.target.value || undefined)}
					className='h-7 w-full rounded-lg border border-dashed border-input/40 bg-background px-2.5 text-xs placeholder:text-muted-foreground/40 focus:outline-none'
				/>
				{activeFilter && (
					<button
						type='button'
						onClick={() => column.setFilterValue(undefined)}
						className='absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
					>
						<IconX className='size-3' />
					</button>
				)}
			</div>
		</div>
	)
}
