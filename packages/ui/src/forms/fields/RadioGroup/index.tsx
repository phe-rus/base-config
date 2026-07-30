import { FieldLabel } from '../../../components/field'
import {
	RadioGroup as RadioGroupUi,
	RadioGroupItem
} from '../../../components/radio-group'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps, SelectOption } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type RadioGroupProps = BaseFieldProps & {
	options: SelectOption[]
}

export const RadioGroup = ({
	label,
	description,
	disabled,
	required,
	options
}: RadioGroupProps) => {
	const { field, name, value, isInvalid, handleChange } =
		useFieldState<string>()

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<RadioGroupUi
				name={name}
				value={value}
				onValueChange={(value) => handleChange(value)}
				disabled={disabled}
				aria-invalid={isInvalid}
			>
				{options.map((option) => (
					<FieldLabel key={option.value} htmlFor={`${name}-${option.value}`}>
						<RadioGroupItem
							id={`${name}-${option.value}`}
							value={option.value}
						/>
						{option.label}
					</FieldLabel>
				))}
			</RadioGroupUi>
		</FieldShell>
	)
}
