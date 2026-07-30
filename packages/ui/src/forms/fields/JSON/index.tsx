import { CodeEditor } from '../../../components/code-editor'
import { cn } from '../../../lib/utils'
import { useEffect, useState } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type JSONFieldProps = BaseFieldProps & {
	placeholder?: string
	height?: string
	className?: string
}

/**
 * The field's own value is the *parsed* JSON (`unknown`, matching
 * Payload's own JSON field — the real difference from `Code`, which
 * always saves a plain string, see that field's own doc comment), but the
 * editor edits text — so this keeps its own local `text` state, separate
 * from the committed value, and only calls `handleChange` on blur with
 * genuinely valid JSON. Typing something momentarily invalid never
 * corrupts the real field value; it just shows a parse error until the
 * text is valid again. Shares `CodeEditor` (`components/code-editor.tsx`)
 * with `Code` — same real editor, just fixed to the `json` language and
 * with no language toggle at all (JSON is the only thing this field is
 * ever for).
 */
export const JSON = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	height
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
			<CodeEditor
				id={name}
				value={text}
				placeholder={placeholder}
				height={height}
				editable={!disabled}
				language='json'
				languages={[]}
				aria-invalid={isInvalid || Boolean(parseError)}
				onChange={setText}
				onBlur={commit}
			/>
		</FieldShell>
	)
}
