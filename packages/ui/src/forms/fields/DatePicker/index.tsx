import { Button } from '../../../components/button'
import { Calendar } from '../../../components/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '../../../components/popover'
import { IconCalendar } from '@tabler/icons-react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type DatePickerProps = BaseFieldProps & {
	placeholder?: string
	/** Formats the selected date for display on the trigger button. Defaults to the browser's locale short date format. */
	formatDate?: (date: Date) => string
}

const defaultFormatDate = (date: Date) => date.toLocaleDateString()

export const DatePicker = ({
	label,
	description,
	disabled,
	required,
	placeholder = 'Pick a date',
	formatDate = defaultFormatDate
}: DatePickerProps) => {
	const { field, name, value, isInvalid, handleChange } =
		useFieldState<string>()

	const selected = value ? new Date(value) : undefined

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<Popover>
				<PopoverTrigger
					render={
						<Button
							id={name}
							variant='outline'
							disabled={disabled}
							aria-invalid={isInvalid}
							className='w-full justify-start font-normal'
						/>
					}
				>
					<IconCalendar />
					{selected ? formatDate(selected) : placeholder}
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0'>
					<Calendar
						mode='single'
						selected={selected}
						onSelect={(date) => handleChange(date ? date.toISOString() : '')}
						disabled={disabled}
					/>
				</PopoverContent>
			</Popover>
		</FieldShell>
	)
}
