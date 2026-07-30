import {
	Select as SelectUi,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../../components/select'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps, SelectOption } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type SelectProps = BaseFieldProps & {
	placeholder?: string
	options: SelectOption[]
} & {
	defaultValue?: string
}

export const Select = ({
	label,
	description,
	disabled,
	required,
	placeholder,
	defaultValue,
	options
}: SelectProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<SelectUi
				value={value ?? ''}
				defaultValue={defaultValue}
				onValueChange={(value) => handleChange(value ?? '')}
				disabled={disabled}
			>
				<SelectTrigger
					id={name}
					aria-invalid={isInvalid}
					onBlur={handleBlur}
					className='w-full'
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</SelectUi>
		</FieldShell>
	)
}
