import { InputGroup, InputGroupTextarea } from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type CodeProps = BaseFieldProps & {
	placeholder?: string
	rows?: number
	className?: string
}

/**
 * A monospace `Textarea` — no syntax highlighting (that's a real editor
 * component, out of scope here), just the font/whitespace treatment that
 * separates "code" from prose in the admin UI.
 */
export const Code = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	rows = 8
}: CodeProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

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
					onBlur={handleBlur}
					onChange={(e) => handleChange(e.target.value)}
					aria-invalid={isInvalid}
					required={required}
					disabled={disabled}
					spellCheck={false}
					className='font-mono text-sm whitespace-pre'
				/>
			</InputGroup>
		</FieldShell>
	)
}
