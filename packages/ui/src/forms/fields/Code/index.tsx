import {
	CodeEditor,
	type CodeEditorLanguage,
	type CodeEditorLanguageOption,
	defaultCodeEditorLanguages
} from '../../../components/code-editor'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

export type { CodeEditorLanguage as CodeLanguage } from '../../../components/code-editor'

type CodeProps = BaseFieldProps & {
	placeholder?: string
	className?: string
	height?: string
	/** Which CodeMirror language mode to load; defaults to TypeScript. */
	language?: CodeEditorLanguage
	/** The corner language select's own options: see `CodeEditor`'s own doc comment (`components/code-editor.tsx`). Pass `[]` (or omit `onLanguageChange`) to hide the toggle for a fixed-language use of this field. */
	languages?: CodeEditorLanguageOption[]
	/** Wired straight to `CodeEditor`'s own corner select: this field never manages `language` itself (there's no single "language" concept in a plain string value), so a caller that wants the toggle owns the language state itself, e.g. the `code` block's own sibling `language` field (`@baseconfig/core`'s `collections/blocks/Code/index.tsx`). */
	onLanguageChange?: (language: CodeEditorLanguage) => void
	/** Called with every keystroke's new value, in addition to (not instead of) the field's own `onChange`, for a caller that needs to react to the content itself, e.g. the `code` block's own language auto-detect. */
	onValueChange?: (value: string) => void
}

/**
 * Saves a plain string (see `CodeProps`' own doc comment on `onValueChange`/
 * `onLanguageChange` for the two things beyond that this exposes): the
 * Admin Panel gets a real CodeMirror 6 editor with a corner language
 * toggle (`CodeEditor`, `components/code-editor.tsx`, a form-agnostic
 * component this field is a thin wrapper around, reusable outside
 * `@baseconfig/ui/forms` too) instead of a plain textarea; what's actually
 * persisted never changes shape. See `JSON` (`../JSON/index.tsx`) for the
 * sibling field that shares the same `CodeEditor` but commits *parsed*
 * JSON instead of a string, the real distinction between the two, not
 * just a styling choice.
 */
export const Code = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	height,
	language,
	languages = defaultCodeEditorLanguages,
	onLanguageChange,
	onValueChange
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
			<CodeEditor
				id={name}
				value={value ?? ''}
				placeholder={placeholder}
				height={height}
				editable={!disabled}
				aria-invalid={isInvalid}
				language={language}
				languages={languages}
				onLanguageChange={onLanguageChange}
				onChange={(next) => {
					handleChange(next)
					onValueChange?.(next)
				}}
				onBlur={handleBlur}
			/>
		</FieldShell>
	)
}
