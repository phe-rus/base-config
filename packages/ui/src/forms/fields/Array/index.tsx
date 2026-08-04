import {
	IconArrowDown,
	IconArrowUp,
	IconCopy,
	IconDotsVertical,
	IconGripVertical,
	IconPlus,
	IconTrash
} from '@tabler/icons-react'
import { useState } from 'react'
import { Button, buttonVariants } from '../../../components/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '../../../components/collapsible'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../../components/dropdown-menu'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '../../../components/tooltip'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type ArrayFieldProps = BaseFieldProps & {
	/**
	 * Replaces the default "Add items" row with custom UI (e.g. a menu of
	 * item variants to choose from). Called with a function that appends a
	 * given item to the array; call it with no argument to append `{}`.
	 */
	renderAdd?: (add: (item?: Record<string, any>) => void) => React.ReactNode
	/**
	 * When `renderAdd` is given, renders it *after* the item list instead of
	 * before it (`BlocksField`'s "Add <label>" row belongs at the bottom of
	 * its block stack). Ignored without `renderAdd`; the default "Add items"
	 * row stays at the top either way.
	 */
	addAtBottom?: boolean
	/** Overrides the collapsed row header's label: the default falls back through `item?.label ?? item?.title ?? item?.name ?? 'No name'`, which only ever matches when an item happens to have one of those exact fields (e.g. a block instance never does, since a block's own type name lives in `blockType`/a registry, not on the item itself; see `@baseconfig/core`'s `BlocksField`, the one real consumer of this so far). */
	getItemLabel?: (item: Record<string, any>, index: number) => string
	/**
	 * Replaces the collapsed row header's label with fully custom content
	 * (`BlocksField` renders its index/slug/editable-block-header stack
	 * through this). The drag handle and the row's action menu stay in the
	 * shared chrome either way.
	 */
	renderItemHeader?: (props: {
		path: string
		index: number
		item: Record<string, any>
	}) => React.ReactNode
	children: (props: {
		path: string
		index: number
		value: any
	}) => React.ReactNode
}

export const ArrayField = ({
	label,
	description,
	required,
	renderAdd,
	addAtBottom,
	getItemLabel,
	renderItemHeader,
	children
}: ArrayFieldProps) => {
	const {
		field,
		name,
		value = [],
		isInvalid,
		handleChange
	} = useFieldState<Record<string, any>[]>()
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
	const list = Array.isArray(value) ? value : []

	const handleAddItem = (item: Record<string, any> = {}) => {
		handleChange([...list, item])
	}

	const handleRemoveItem = (indexToRemove: number) => {
		handleChange(list.filter((_, idx) => idx !== indexToRemove))
	}

	const handleDuplicateItem = (indexToDuplicate: number) => {
		const item = list[indexToDuplicate]
		if (item === undefined) return
		const updatedList = [...list]
		// Deep-copy so the copy edits independently of the original (item
		// data is all JSON-safe plain objects/arrays, `structuredClone` is
		// enough), inserted right below the source row, Payload's own
		// duplicate-row behavior.
		updatedList.splice(indexToDuplicate + 1, 0, structuredClone(item))
		handleChange(updatedList)
	}

	const handleMoveItem = (index: number, direction: -1 | 1) => {
		const target = index + direction
		if (target < 0 || target >= list.length) return
		const updatedList = [...list]
		const [moved] = updatedList.splice(index, 1)
		updatedList.splice(target, 0, moved)
		handleChange(updatedList)
	}

	const handleDragStart = (index: number) => {
		setDraggedIndex(index)
	}

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault()
		if (draggedIndex !== null && draggedIndex !== index) {
			setDragOverIndex(index)
		}
	}

	const handleDrop = (index: number) => {
		if (draggedIndex === null || draggedIndex === index) return

		const updatedList = [...list]
		const [draggedItem] = updatedList.splice(draggedIndex, 1)
		updatedList.splice(index, 0, draggedItem)

		handleChange(updatedList)
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	const handleDragEnd = () => {
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	const addRow = renderAdd ? (
		renderAdd(handleAddItem)
	) : (
		<div
			onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
			className='flex items-center gap-3 cursor-pointer'
			onClick={() => handleAddItem()}
		>
			<Button type='button' variant='secondary' size='icon-sm'>
				<IconPlus />
			</Button>
			Add items
		</div>
	)

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<section className='flex flex-col gap-1'>
				{addAtBottom ? null : addRow}
				<div className='flex flex-col gap-1 ml-2'>
					{list.map((item, index) => {
						const itemPath = `${name}[${index}]`
						const label = getItemLabel
							? getItemLabel(item, index)
							: (item?.label ?? item?.title ?? item?.name ?? 'No name')
						const isDragging = draggedIndex === index
						const isDragOver = dragOverIndex === index

						return (
							<div
								key={index}
								onDragOver={(e) => handleDragOver(e, index)}
								onDrop={() => handleDrop(index)}
								className={cn(
									'transition-all duration-200 rounded-md',
									isDragging && 'opacity-40 scale-[0.98]',
									isDragOver && 'border border-olive-500 pt-2 border-dashed'
								)}
							>
								<Collapsible>
									<CollapsibleTrigger
										nativeButton={false}
										className={cn(
											'flex items-center gap-2 rounded-md cursor-pointer',
											'w-full px-1 py-1 justify-between border border-dashed',
											'bg-input/35'
										)}
										render={
											<div className='flex items-center justify-between'>
												<div className='flex min-w-0 flex-1 items-center gap-2'>
													<Tooltip>
														<TooltipTrigger
															render={
																<button
																	aria-label='Reorder'
																	type='button'
																	draggable
																	onDragStart={() => handleDragStart(index)}
																	onDragEnd={handleDragEnd}
																	className={cn(
																		buttonVariants({
																			variant: 'secondary',
																			size: 'icon-xs',
																			// `p-0` keeps the handle from
																			// eating row width, so a
																			// `renderItemHeader` input can
																			// stretch `w-full`.
																			className: 'w-fit cursor-grab p-0'
																		})
																	)}
																>
																	<IconGripVertical />
																</button>
															}
														/>
														<TooltipContent>Drag to reorder</TooltipContent>
													</Tooltip>
													{renderItemHeader ? (
														renderItemHeader({
															path: itemPath,
															index,
															item
														})
													) : (
														<span className='text-sm'>{label}</span>
													)}
												</div>
												<div className='flex shrink-0 items-center gap-1'>
													<DropdownMenu>
														<Tooltip>
															<TooltipTrigger
																render={
																	<DropdownMenuTrigger
																		aria-label='Row options'
																		type='button'
																		// Prevent toggle when opening the
																		// row's action menu.
																		onClick={(e) => e.stopPropagation()}
																		className={cn(
																			buttonVariants({
																				variant: 'secondary',
																				size: 'icon-xs'
																			})
																		)}
																	>
																		<IconDotsVertical />
																	</DropdownMenuTrigger>
																}
															/>
															<TooltipContent>Row options</TooltipContent>
														</Tooltip>
														<DropdownMenuContent align='end'>
															<DropdownMenuItem
																disabled={index === 0}
																onClick={(e) => {
																	e.stopPropagation()
																	handleMoveItem(index, -1)
																}}
															>
																<IconArrowUp />
																Move up
															</DropdownMenuItem>
															<DropdownMenuItem
																disabled={index === list.length - 1}
																onClick={(e) => {
																	e.stopPropagation()
																	handleMoveItem(index, 1)
																}}
															>
																<IconArrowDown />
																Move down
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation()
																	handleDuplicateItem(index)
																}}
															>
																<IconCopy />
																Duplicate
															</DropdownMenuItem>
															<DropdownMenuItem
																variant='destructive'
																onClick={(e) => {
																	e.stopPropagation()
																	handleRemoveItem(index)
																}}
															>
																<IconTrash />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										}
									/>
									<CollapsibleContent
										className={cn(
											'flex flex-col gap-3 py-3 px-3',
											'border-x border-b border-dashed'
										)}
									>
										{children({ path: itemPath, index, value: item })}
									</CollapsibleContent>
								</Collapsible>
							</div>
						)
					})}
				</div>
				{addAtBottom ? addRow : null}
			</section>
		</FieldShell>
	)
}
