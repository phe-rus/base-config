import { InputGroup, InputGroupTextarea } from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { useEffect, useState } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type JSONFieldProps = BaseFieldProps & {
	placeholder?: string
	rows?: number
	className?: string
}

/**
 * The field's own value is the *parsed* JSON (`unknown`, matching
 * Payload's own JSON field), but the textarea edits a string — so this
 * keeps its own local `text` state, separate from the committed value,
 * and only calls `handleChange` on blur with genuinely valid JSON. Typing
 * something momentarily invalid never corrupts the real field value; it
 * just shows a parse error until the text is valid again.
 */
export const JSON = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	rows = 10
}: JSONFieldProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<unknown>()

	const [text, setText] = useState(() =>
		value === undefined ? '' : globalThis.JSON.stringify(value, null, 2)
	)
	const [parseError, setParseError] = useState<string | undefined>()

	useEffect(() => {
		setText(
			value === undefined ? '' : globalThis.JSON.stringify(value, null, 2)
		)
	}, [value])

	const commit = () => {
		if (!text.trim()) {
			setParseError(undefined)
			handleChange(undefined)
			handleBlur()
			return
		}
		try {
			const parsed: unknown = globalThis.JSON.parse(text)
			setParseError(undefined)
			handleChange(parsed)
		} catch (err) {
			setParseError(err instanceof Error ? err.message : 'Invalid JSON')
		}
		handleBlur()
	}

	return (
		<FieldShell
			required={required}
			label={label}
			description={parseError ?? description}
			field={field}
			isInvalid={isInvalid || Boolean(parseError)}
			className={cn(className)}
		>
			<InputGroup>
				<InputGroupTextarea
					id={name}
					name={name}
					value={text}
					placeholder={placeholder}
					rows={rows}
					onBlur={commit}
					onChange={(e) => setText(e.target.value)}
					aria-invalid={isInvalid || Boolean(parseError)}
					required={required}
					disabled={disabled}
					spellCheck={false}
					className='font-mono text-sm whitespace-pre'
				/>
			</InputGroup>
		</FieldShell>
	)
}
