import { FieldLabel } from '../../../components/field'
import { Switch as SwitchUi } from '../../../components/switch'
import { FieldShell, RequiredMark } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type SwitchProps = BaseFieldProps

export const Switch = ({
	label,
	description,
	disabled,
	required
}: SwitchProps) => {
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
			<SwitchUi
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
