import type { BasiccnContent } from '@base/ui/basiccn'
import { Preview } from '@base/ui/basiccn/preview'
import { IconArticle } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const richTextBlockSchema = z.object({
	blockType: z.literal('richtext'),
	content: z.custom<BasiccnContent>().optional()
})

function RichTextBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<form.AppField name={`${path}.content`}>
			{(f: any) => (
				<f.RichText label='Content' placeholder='Write something…' />
			)}
		</form.AppField>
	)
}

/**
 * **A real, disclosed gap, confirmed by testing rather than assumed away**:
 * `Preview` mounts a real tiptap/ProseMirror `EditorView`, which needs a
 * real DOM — `useEditor`'s `immediatelyRender: false` (required for any
 * React SSR at all, tiptap's own documented requirement) defers that
 * construction to a `useEffect`, which never runs server-side. That means
 * this block's actual text is **absent from the server-rendered HTML** —
 * confirmed against a real request, not just the type signature — and only
 * appears once client JS hydrates and mounts the editor. Fine for the
 * admin's own editing screens (JS is already guaranteed there); a real gap
 * for a public, potentially-crawled page. A proper fix is a dependency-free
 * tiptap-JSON → JSX renderer covering this schema's actual node/mark set
 * (see `utils/extensions.ts`'s `BasiccnExtensions` for the full list,
 * including a syntax-highlighted code block and a custom image node) —
 * real scope on its own, deliberately not attempted in this pass.
 */
export function RichTextBlockRender({
	data
}: {
	data: Record<string, unknown>
}) {
	const content = data.content as BasiccnContent | undefined
	if (!content) return null
	return <Preview content={content} />
}

export const richTextBlock: BlockConfig = {
	slug: 'richtext',
	label: 'Rich text',
	schema: richTextBlockSchema,
	defaultValue: { content: undefined },
	Fields: RichTextBlockFields,
	Render: RichTextBlockRender,
	Icon: IconArticle
}
