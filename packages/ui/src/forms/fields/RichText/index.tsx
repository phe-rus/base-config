import { Editor, type BasiccnContent } from '../../../basiccn'
import { cn } from '../../../lib/utils'
import { useCallback } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type TextareaProps = BaseFieldProps & {
	placeholder?: string
} & {
	className?: string
	contentClass?: string
}

export const RichText = ({
	label,
	description,
	placeholder,
	required,
	contentClass,
	className
}: TextareaProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<BasiccnContent>()

	// Only trigger form changes if the stringified JSON content is different
	const handleEditorChange = useCallback(
		(newValue: BasiccnContent) => {
			const currentString = JSON.stringify(value)
			const newString = JSON.stringify(newValue)

			if (currentString !== newString) {
				handleChange(newValue)
			}
		},
		[value, handleChange]
	)

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
			className={cn(className)}
		>
			<Editor
				id={name}
				value={value}
				placeholder={placeholder}
				contentClass={contentClass}
				onBlur={handleBlur}
				onChange={handleEditorChange} // Use the intercepted handler here
				aria-invalid={isInvalid}
			/>
		</FieldShell>
	)
}
