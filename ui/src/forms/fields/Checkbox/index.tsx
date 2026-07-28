import { Checkbox as CheckboxUi } from '../../../components/checkbox'
import { FieldLabel } from '../../../components/field'
import { FieldShell, RequiredMark } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type CheckboxProps = BaseFieldProps

export const Checkbox = ({
	label,
	description,
	disabled,
	required
}: CheckboxProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<boolean>()

	return (
		<FieldShell
			orientation='horizontal'
			field={field}
			required={required}
			isInvalid={isInvalid}
			description={description}
		>
			<CheckboxUi
				id={name}
				name={name}
				checked={value ?? false}
				aria-invalid={isInvalid}
				onBlur={handleBlur}
				disabled={disabled}
				onCheckedChange={handleChange}
			/>
			<FieldLabel htmlFor={name}>
				{label}
				{required && <RequiredMark />}
			</FieldLabel>
		</FieldShell>
	)
}
