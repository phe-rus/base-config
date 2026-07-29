import type { BasiccnContent } from '@base/ui/basiccn'
import { Preview } from '@base/ui/basiccn/preview'
import { InputGroup, InputGroupTextarea } from '@base/ui/components/input-group'
import { FieldShell, useFieldState } from '@base/ui/forms'
import { IconCode } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

const codeLanguages = ['ts', 'tsx', 'js', 'jsx', 'json'] as const
type CodeLanguage = (typeof codeLanguages)[number]

export const codeBlockSchema = z.object({
	blockType: z.literal('code'),
	language: z.enum(codeLanguages).optional(),
	code: z.string().optional()
})

const languageOptions = [
	{ label: 'TypeScript', value: 'ts' },
	{ label: 'TSX', value: 'tsx' },
	{ label: 'JavaScript', value: 'js' },
	{ label: 'JSX', value: 'jsx' },
	{ label: 'JSON', value: 'json' }
]

/** `lowlight`'s own `common` bundle (`utils/extensions.ts`) only registers `typescript`/`javascript`/`json` by name — no separate `tsx`/`jsx` grammar exists, so both map onto their non-JSX sibling (still a real, readable highlight, just not JSX-attribute-aware). */
const lowlightLanguageOf: Record<CodeLanguage, string> = {
	ts: 'typescript',
	tsx: 'typescript',
	js: 'javascript',
	jsx: 'javascript',
	json: 'json'
}

/**
 * Only JSON is realistically auto-detectable here without a real parser or
 * a heavy new dependency — every other language always stays exactly what
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

function CodeBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.language`}>
				{(f: any) => (
					<f.Select
						label='Language'
						defaultValue='ts'
						options={languageOptions}
					/>
				)}
			</form.AppField>
			<form.AppField name={`${path}.code`}>
				{() => <CodeBlockCodeField form={form} path={path} />}
			</form.AppField>
		</div>
	)
}

/**
 * A field-shaped like `@base/ui/forms`' own `Code` (same `InputGroup`/
 * `InputGroupTextarea` primitives, same monospace styling), not reused
 * directly — `Code` exposes no `onChange` of its own to hook the JSON
 * auto-detect into, and adding one would widen a shared component just
 * for this one caller. `useFieldState()` is the same exported hook `Code`
 * itself calls internally (`@base/ui/forms`), so this is genuinely the
 * same field-binding mechanism, just with one extra side effect on change.
 */
function CodeBlockCodeField({ form, path }: BlockFieldsProps) {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<string>()

	return (
		<FieldShell label='Code' field={field} isInvalid={isInvalid}>
			<InputGroup>
				<InputGroupTextarea
					id={name}
					name={name}
					value={value ?? ''}
					placeholder='Paste or write code…'
					rows={10}
					spellCheck={false}
					aria-invalid={isInvalid}
					className='font-mono text-sm whitespace-pre'
					onBlur={handleBlur}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
						handleChange(e.target.value)
						if (looksLikeJson(e.target.value)) {
							form.setFieldValue(`${path}.language`, 'json')
						}
					}}
				/>
			</InputGroup>
		</FieldShell>
	)
}

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender` — see that function's own doc comment for the full explanation. Reuses `Preview` (a real tiptap `codeBlock` node, already syntax-highlighted via `CodeBlockLowlight`, `utils/extensions.ts`) rather than a new HTML-highlighting path. */
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
