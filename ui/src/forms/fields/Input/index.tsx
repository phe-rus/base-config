import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { IconEye, IconEyeOff, type TablerIcon } from '@tabler/icons-react'
import { type HTMLInputTypeAttribute, useState } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type InputProps = BaseFieldProps & {
	Icon?: TablerIcon
	placeholder?: string
	type?: HTMLInputTypeAttribute
	autoComplete?: string
} & {
	maxLength?: number
	minLength?: number
	className?: string
}

export const Input = ({
	label,
	Icon,
	description,
	placeholder,
	required,
	maxLength,
	minLength,
	type,
	disabled,
	className,
	autoComplete
}: InputProps) => {
	const [showPassword, setShowPassword] = useState(false)
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

	const isPassword = type === 'password'
	const fieldType = isPassword ? (showPassword ? 'text' : 'password') : type
	const PasswordIcon = isPassword ? (showPassword ? IconEyeOff : IconEye) : null

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
			className={cn(className)}
		>
			<InputGroup aria-required={required} aria-disabled={disabled}>
				<InputGroupInput
					placeholder={placeholder}
					id={name}
					name={name}
					value={value}
					maxLength={maxLength}
					minLength={minLength}
					onBlur={handleBlur}
					onChange={(e) => handleChange(e.target.value)}
					aria-invalid={isInvalid}
					type={fieldType}
					required={required}
					disabled={disabled}
					autoComplete={autoComplete}
				/>

				{Icon && (
					<InputGroupAddon align='inline-start'>
						<Icon />
					</InputGroupAddon>
				)}

				{PasswordIcon && (
					<InputGroupAddon align='inline-end'>
						<InputGroupButton
							size='icon-xs'
							variant='ghost'
							onClick={() => setShowPassword((prev) => !prev)}
							className='cursor-pointer rounded-full'
						>
							<PasswordIcon />
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>
		</FieldShell>
	)
}
