import { IconGripVertical, IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Button, buttonVariants } from '../../../components/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '../../../components/collapsible'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type ArrayFieldProps = BaseFieldProps & {
	/**
	 * Replaces the default "Add items" row with custom UI (e.g. a menu of
	 * item variants to choose from). Called with a function that appends a
	 * given item to the array — call it with no argument to append `{}`.
	 */
	renderAdd?: (add: (item?: Record<string, any>) => void) => React.ReactNode
	/** Overrides the collapsed row header's label — the default falls back through `item?.label ?? item?.title ?? item?.name ?? 'No name'`, which only ever matches when an item happens to have one of those exact fields (e.g. a block instance never does, since a block's own type name lives in `blockType`/a registry, not on the item itself — see `@base/config`'s `BlocksField`, the one real consumer of this so far). */
	getItemLabel?: (item: Record<string, any>, index: number) => string
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
	getItemLabel,
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

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<section className='flex flex-col gap-4'>
				{renderAdd ? (
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
				)}
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
											'flex items-center gap-3 rounded-md cursor-pointer',
											'w-full px-1 py-1 justify-between border border-dashed',
											'bg-input/35'
										)}
										render={
											<div className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
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
																className: 'w-fit cursor-grab'
															})
														)}
													>
														<IconGripVertical />
													</button>
													<span className='text-sm'>{label}</span>
												</div>
												<button
													type='button'
													className={cn(
														buttonVariants({
															variant: 'destructive',
															size: 'icon-xs'
														})
													)}
													onClick={(e) => {
														// Prevent toggle when clicking the delete button
														e.stopPropagation()
														handleRemoveItem(index)
													}}
												>
													<IconX />
												</button>
											</div>
										}
									/>
									<CollapsibleContent
										className={cn('flex flex-col gap-3 py-3 pl-0')}
									>
										{children({ path: itemPath, index, value: item })}
									</CollapsibleContent>
								</Collapsible>
							</div>
						)
					})}
				</div>
			</section>
		</FieldShell>
	)
}
