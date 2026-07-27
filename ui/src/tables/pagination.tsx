import { Button } from '../components/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../components/select'
import type { Table } from '@tanstack/react-table'
import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight
} from '@tabler/icons-react'

type DataTablePaginationProps<TData> = {
	table: Table<TData>
	pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
	table,
	pageSizeOptions = [10, 20, 30, 50]
}: DataTablePaginationProps<TData>) {
	const { pageIndex, pageSize } = table.getState().pagination
	const pageCount = table.getPageCount()

	return (
		<div className='flex items-center gap-5 mt-5'>
			<p className='text-xs text-muted-foreground'>
				Page {pageCount ? pageIndex + 1 : 0} of {pageCount}
			</p>

			<div className='flex items-center gap-1'>
				<Button
					variant='secondary'
					size='icon-sm'
					disabled={!table.getCanPreviousPage()}
					onClick={() => table.setPageIndex(0)}
				>
					<IconChevronsLeft />
				</Button>
				<Button
					variant='secondary'
					size='icon-sm'
					disabled={!table.getCanPreviousPage()}
					onClick={() => table.previousPage()}
				>
					<IconChevronLeft />
				</Button>
				<Button
					variant='secondary'
					size='icon-sm'
					disabled={!table.getCanNextPage()}
					onClick={() => table.nextPage()}
				>
					<IconChevronRight />
				</Button>
				<Button
					variant='outline'
					size='icon-sm'
					disabled={!table.getCanNextPage()}
					onClick={() => table.setPageIndex(pageCount - 1)}
				>
					<IconChevronsRight />
				</Button>
			</div>

			<Select
				value={`${pageSize}`}
				onValueChange={(value) => table.setPageSize(Number(value))}
			>
				<SelectTrigger size='sm' className='w-16'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent alignItemWithTrigger>
					{pageSizeOptions.map((size) => (
						<SelectItem key={size} value={`${size}`}>
							{size}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
