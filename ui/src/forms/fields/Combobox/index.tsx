import {
	Combobox as ComboboxUi,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '../../../components/combobox'
import { useMemo } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps, SelectOption } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type ComboboxProps = BaseFieldProps & {
	placeholder?: string
	emptyLabel?: string
	options: SelectOption[]
}

export const Combobox = ({
	label,
	description,
	disabled,
	required,
	placeholder,
	emptyLabel = 'No results found.',
	options
}: ComboboxProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

	const selected = useMemo(
		() => options.find((option) => option.value === value) ?? null,
		[options, value]
	)

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<ComboboxUi
				items={options}
				value={selected}
				onValueChange={(item) => handleChange(item?.value ?? '')}
				disabled={disabled}
			>
				<ComboboxInput
					id={name}
					name={name}
					placeholder={placeholder}
					onBlur={handleBlur}
					aria-invalid={isInvalid}
				/>
				<ComboboxContent>
					<ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
					<ComboboxList>
						{options.map((option) => (
							<ComboboxItem key={option.value} value={option}>
								{option.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</ComboboxUi>
		</FieldShell>
	)
}
