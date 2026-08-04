import type { BlockFieldsProps } from '@baseconfig/core'
import { defaultCodeEditorLanguages } from '@baseconfig/ui/components/code-editor'
import type { FC } from 'react'

const codeLanguages = ['ts', 'tsx', 'js', 'jsx', 'json'] as const
type CodeLanguage = (typeof codeLanguages)[number]

/** Only JSON is realistically auto-detectable here without a real parser or a heavy new dependency; every other language always stays exactly what was manually selected. Deliberately modest, not real language detection. */
function looksLikeJson(value: string): boolean {
	const trimmed = value.trim()
	if (!trimmed || !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
		return false
	}
	try {
		JSON.parse(trimmed)
		return true
	} catch {
		return false
	}
}

/**
 * The `language` value lives in a sibling field, but the editor's corner
 * toggle drives it directly: the `code` field's `form.AppField` render
 * callback is nested inside the `language` field's own render callback so
 * the toggle always reflects the sibling's *current* value, the same
 * nested-`form.AppField` pattern the library's own block used.
 */
export const CodeBlockFields: FC<BlockFieldsProps> = ({ form, path }) => {
	return (
		<form.AppField name={`${path}.language`}>
			{(languageField: any) => (
				<form.AppField name={`${path}.code`}>
					{(f: any) => (
						<f.Code
							label='Code'
							placeholder='Paste or write code…'
							language={languageField.state.value ?? 'ts'}
							languages={defaultCodeEditorLanguages}
							onLanguageChange={(next: CodeLanguage) => {
								form.setFieldValue(`${path}.language`, next)
							}}
							onValueChange={(next: string) => {
								if (looksLikeJson(next)) {
									form.setFieldValue(`${path}.language`, 'json')
								}
							}}
						/>
					)}
				</form.AppField>
			)}
		</form.AppField>
	)
}
