import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor
} from '../../../components/combobox'
import { cn } from '../../../lib/utils'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type KeywordsInputProps = BaseFieldProps & {
	placeholder?: string
	className?: string
	suggestions?: string[]
	/** Called with the raw text whenever the user creates a new keyword (not just picks an existing suggestion), e.g. to persist it into a shared, app-wide keyword pool. */
	onCreate?: (value: string) => void
}

export const KeywordsInput = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	suggestions,
	onCreate
}: KeywordsInputProps) => {
	const anchor = useComboboxAnchor()
	const [searchValue, setSearchValue] = useState('')
	const [itemsPool, setItemsPool] = useState<string[]>(suggestions || [])
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string[]>()
	const activeValues = Array.isArray(value) ? value : []
	const itemExists = itemsPool.some(
		(item) =>
			typeof item === 'string' &&
			item.toLowerCase() === searchValue.trim().toLowerCase()
	)

	// `suggestions` can arrive after mount (e.g. a live-queried shared keyword
	// pool that starts empty), merge new ones in rather than only reading
	// `suggestions` once via `useState`'s initializer. Bails out when nothing
	// actually changed (not just re-checking the array *reference*): a
	// caller passing a `suggestions` array that's re-created every render
	// (any `.map()`/`.filter()` result, a fresh `[]` literal, …) would
	// otherwise turn this into an infinite render loop: new reference →
	// effect fires → `setItemsPool` → re-render → caller passes another new
	// reference → repeat.
	useEffect(() => {
		if (!suggestions) return
		setItemsPool((prev) => {
			const merged = new Set(prev)
			for (const item of suggestions) {
				if (typeof item === 'string' && item.trim()) merged.add(item)
			}
			if (merged.size === prev.length) return prev
			return Array.from(merged)
		})
	}, [suggestions])

	const handleCreateCustomItem = () => {
		const newValue = searchValue.trim()
		if (!newValue) return
		if (!itemsPool.includes(newValue)) {
			setItemsPool((prev) => [...prev, newValue])
		}
		if (!activeValues.includes(newValue)) {
			handleChange([...activeValues, newValue])
		}
		onCreate?.(newValue)
		setSearchValue('')
	}

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
			className={cn(className)}
		>
			<div onBlur={handleBlur} className='w-full'>
				<Combobox
					multiple
					autoHighlight
					items={itemsPool}
					value={activeValues}
					onValueChange={(nextValues) => handleChange(nextValues)}
					disabled={disabled}
				>
					<ComboboxChips ref={anchor}>
						<ComboboxValue>
							{(values) => (
								<React.Fragment>
									{values.map((val: string) => (
										<ComboboxChip key={val}>{val}</ComboboxChip>
									))}
									<ComboboxChipsInput
										placeholder={activeValues.length === 0 ? placeholder : ''}
										value={searchValue}
										onChange={(e) => setSearchValue(e.target.value)}
										id={name}
										name={name}
										disabled={disabled}
										onKeyDown={(e) => {
											if (
												(e.key === 'Enter' || e.key === ',') &&
												searchValue.trim() &&
												!itemExists
											) {
												e.preventDefault()
												handleCreateCustomItem()
											}
										}}
									/>
								</React.Fragment>
							)}
						</ComboboxValue>
					</ComboboxChips>

					<ComboboxContent anchor={anchor}>
						{searchValue.trim() !== '' && !itemExists ? (
							<ComboboxEmpty
								role='button'
								className='text-xs px-5'
								onClick={handleCreateCustomItem}
							>
								Create keyword: "{searchValue}"
							</ComboboxEmpty>
						) : (
							<ComboboxEmpty>No suggestions found.</ComboboxEmpty>
						)}

						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
		</FieldShell>
	)
}
