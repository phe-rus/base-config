import {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea
} from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type TextareaProps = BaseFieldProps & {
	placeholder?: string
	rows?: number
	minLength?: number
	maxLength?: number
} & {
	className?: string
}

export const Textarea = ({
	label,
	description,
	placeholder,
	maxLength,
	required,
	disabled,
	className,
	rows,
	minLength
}: TextareaProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

	const checkLength = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const { value } = e.target
		if (maxLength && value.length > maxLength) {
			return
		}
		if (minLength && value.length < minLength) {
			return
		}
		handleChange(e.target.value)
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
			<InputGroup>
				<InputGroupTextarea
					id={name}
					name={name}
					value={value}
					placeholder={placeholder}
					rows={rows}
					maxLength={maxLength}
					onBlur={handleBlur}
					onChange={checkLength}
					aria-invalid={isInvalid}
					required={required}
					disabled={disabled}
				/>
				{(maxLength || minLength) && (
					<InputGroupAddon align='block-end'>
						<InputGroupText>
							{value?.length}/{maxLength}
						</InputGroupText>
					</InputGroupAddon>
				)}
			</InputGroup>
		</FieldShell>
	)
}
