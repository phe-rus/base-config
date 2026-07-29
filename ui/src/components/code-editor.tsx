import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { cn } from '../lib/utils'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from './select'

export type CodeEditorLanguage = 'ts' | 'tsx' | 'js' | 'jsx' | 'json'

export type CodeEditorLanguageOption = {
	label: string
	value: CodeEditorLanguage
}

export const defaultCodeEditorLanguages: CodeEditorLanguageOption[] = [
	{ label: 'TypeScript', value: 'ts' },
	{ label: 'TSX', value: 'tsx' },
	{ label: 'JavaScript', value: 'js' },
	{ label: 'JSX', value: 'jsx' },
	{ label: 'JSON', value: 'json' }
]

export type CodeEditorProps = {
	id?: string
	value?: string
	onChange?: (value: string) => void
	onBlur?: () => void
	placeholder?: string
	height?: string
	editable?: boolean
	className?: string
	'aria-invalid'?: boolean
	/** Current language mode — also drives the corner language select when `languages` is given. Defaults to TypeScript. */
	language?: CodeEditorLanguage
	/**
	 * The corner language select's own options — omit (or pass `[]`) to hide
	 * the toggle entirely and just render a fixed-language editor. Defaults
	 * to the same 5 languages this app's `code` block already exposes
	 * (`@base/config`'s `collections/blocks/code.tsx`), not because this
	 * component only supports those, but because that's the one real
	 * consumer so far — pass a different list for a different caller.
	 */
	languages?: CodeEditorLanguageOption[]
	onLanguageChange?: (language: CodeEditorLanguage) => void
}

function languageExtension(language: CodeEditorLanguage | undefined) {
	switch (language) {
		case 'json':
			return [json()]
		case 'tsx':
			return [javascript({ jsx: true, typescript: true })]
		case 'jsx':
			return [javascript({ jsx: true })]
		case 'js':
			return [javascript()]
		default:
			return [javascript({ typescript: true })]
	}
}

/**
 * Referenced by CSS custom property, not a Tailwind class — CodeMirror's
 * own `EditorView.theme()` injects a real stylesheet, not JSX `className`
 * props, so it can't reach Tailwind's utility classes directly, hence
 * `color-mix()` standing in for Tailwind's own `/<opacity>` suffix syntax
 * (`bg-input/35`, `border-border/35` — the same translucent-surface
 * convention `Input`/`Textarea`/etc. already use everywhere else in this
 * design system, applied here the same way). Uses the consumer's own
 * design tokens (`--input`/`--border`/`--foreground`/etc, whatever they
 * resolve to) rather than a canned CodeMirror theme, same "theming is the
 * consumer's job" stance as every other `base/ui` component — see this
 * package's own CLAUDE.md. No focus ring/border-color change on
 * `.cm-focused` — deliberately quiet, matches this app's own restrained
 * focus treatment elsewhere rather than a bespoke glow just for this field.
 */
const editorTheme = EditorView.theme({
	'&': {
		backgroundColor: 'color-mix(in oklab, var(--input) 35%, transparent)',
		border: '1px solid color-mix(in oklab, var(--border) 35%, transparent)',
		borderRadius: 'var(--radius-md)',
		fontSize: '0.8125rem'
	},
	'&.cm-focused': {
		outline: 'none'
	},
	'.cm-content': {
		fontFamily: 'var(--font-mono, ui-monospace, monospace)',
		caretColor: 'var(--foreground)',
		padding: '0.5rem 0'
	},
	'.cm-cursor': {
		borderLeftColor: 'var(--foreground)'
	},
	'.cm-gutters': {
		backgroundColor: 'transparent',
		border: 'none',
		color: 'var(--muted-foreground)'
	},
	'.cm-activeLine': { backgroundColor: 'transparent' },
	'.cm-activeLineGutter': { backgroundColor: 'transparent' },
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
		backgroundColor:
			'color-mix(in oklab, var(--ring) 25%, transparent) !important'
	}
})

/**
 * A real CodeMirror 6 editor with an optional language toggle sitting
 * inline at its own top-right corner — a self-contained, form-agnostic
 * component (plain `value`/`onChange`, no `useFieldState()`/form context
 * dependency) so it's reusable anywhere, not just as `@base/ui/forms`'
 * own `Code` field (that field is a thin wrapper around this one — see
 * `forms/fields/Code/index.tsx`).
 */
export function CodeEditor({
	id,
	value,
	onChange,
	onBlur,
	placeholder,
	height = '14rem',
	editable = true,
	className,
	'aria-invalid': ariaInvalid,
	language,
	languages = defaultCodeEditorLanguages,
	onLanguageChange
}: CodeEditorProps) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-md border border-border/35',
				'relative',
				className
			)}
		>
			{languages.length > 0 && onLanguageChange ? (
				<Select
					value={language}
					onValueChange={(next) => {
						if (next) onLanguageChange(next)
					}}
				>
					<SelectTrigger
						size='sm'
						className={cn(
							'h-6 border-none bg-transparent px-1.5 text-[10px]',
							'absolute top-0 right-0 z-10 backdrop-blur m-1'
						)}
					>
						<SelectValue placeholder='Language' />
					</SelectTrigger>
					<SelectContent side='bottom' alignItemWithTrigger align='start'>
						{languages.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : null}
			<CodeMirror
				id={id}
				value={value ?? ''}
				placeholder={placeholder}
				height={height}
				editable={editable}
				theme={editorTheme}
				extensions={languageExtension(language)}
				aria-invalid={ariaInvalid}
				basicSetup={{
					foldGutter: false,
					highlightActiveLine: false,
					highlightActiveLineGutter: false
				}}
				className='[&_.cm-editor]:rounded-none [&_.cm-editor]:border-none'
				onChange={(next) => onChange?.(next)}
				onBlur={onBlur}
			/>
		</div>
	)
}
