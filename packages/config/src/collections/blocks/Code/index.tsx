import type { BasiccnContent } from '@baseconfig/ui/basiccn'
import { Preview } from '@baseconfig/ui/basiccn/preview'
import { defaultCodeEditorLanguages } from '@baseconfig/ui/components/code-editor'
import { IconCode } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from '../shared/types'

const codeLanguages = ['ts', 'tsx', 'js', 'jsx', 'json'] as const
type CodeLanguage = (typeof codeLanguages)[number]

export const codeBlockSchema = z.object({
	blockType: z.literal('code'),
	language: z.enum(codeLanguages).optional(),
	code: z.string().optional()
})

/** `lowlight`'s own `common` bundle (`utils/extensions.ts`) only registers `typescript`/`javascript`/`json` by name: no separate `tsx`/`jsx` grammar exists, so both map onto their non-JSX sibling (still a real, readable highlight, just not JSX-attribute-aware). */
const lowlightLanguageOf: Record<CodeLanguage, string> = {
	ts: 'typescript',
	tsx: 'typescript',
	js: 'javascript',
	jsx: 'javascript',
	json: 'json'
}

/**
 * Only JSON is realistically auto-detectable here without a real parser or
 * a heavy new dependency; every other language always stays exactly what
 * was manually selected. Deliberately modest, not real language detection.
 */
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
 * The `code` field's `language` is nested inside the `language` field's
 * own `form.AppField` render callback (rather than read via some separate
 * reactive-subscription API) so the editor's corner toggle always reflects
 * the sibling field's *current* value, the exact same nested-`form.AppField`
 * pattern `nav-menu-field.tsx` already uses (`f.state.value === 'custom' ?
 * <form.AppField name={...}>...`), not a new mechanism. The language
 * select itself lives inline in `f.Code`'s own corner (`languages`/
 * `onLanguageChange`, see `@baseconfig/ui/forms`' `Code` field), no separate
 * visible field for it anymore.
 */
function CodeBlockFields({ form, path }: BlockFieldsProps) {
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

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender`, see that function's own doc comment for the full explanation. Reuses `Preview` (a real tiptap `codeBlock` node, already syntax-highlighted via `CodeBlockLowlight`, `utils/extensions.ts`) rather than a new HTML-highlighting path. */
function CodeBlockRender({ data }: { data: Record<string, unknown> }) {
	const code = typeof data.code === 'string' ? data.code : ''
	if (!code) return null
	const language = codeLanguages.includes(data.language as CodeLanguage)
		? (data.language as CodeLanguage)
		: 'ts'

	const content: BasiccnContent = {
		type: 'doc',
		content: [
			{
				type: 'codeBlock',
				attrs: { language: lowlightLanguageOf[language] },
				content: [{ type: 'text', text: code }]
			}
		]
	}

	return <Preview content={content} />
}

export const codeBlock: BlockConfig = {
	slug: 'code',
	label: 'Code',
	schema: codeBlockSchema,
	defaultValue: { language: 'ts', code: undefined },
	Fields: CodeBlockFields,
	Render: CodeBlockRender,
	Icon: IconCode
}
