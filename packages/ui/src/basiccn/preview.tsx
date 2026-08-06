import { cn } from '../lib/utils'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import { useEffect, useMemo } from 'react'
import { LinkHoverCard } from './components/link-hover-card'
import { CodeBlockPreview } from './nodes/code-block-preview'
import { basiccnTheme } from './theme'
import type { PreviewProps } from './types'
import { BasiccnExtensions, lowlight } from './utils/extensions'

export function Preview({ content, className }: PreviewProps) {
	const editor = useEditor({
		extensions: BasiccnExtensions.configure({
			codeBlock: CodeBlockPreview.configure({ lowlight })
		}),
		content,
		editorProps: {
			attributes: { class: cn(basiccnTheme, className) }
		},
		immediatelyRender: false,
		editable: false
	})

	useEffect(() => {
		if (!editor) return
		const current = JSON.stringify(editor.getJSON())
		const next = JSON.stringify(content ?? {})
		if (current !== next) editor.commands.setContent(content ?? null)
	}, [editor, content])

	const providerValue = useMemo(() => ({ editor }), [editor])

	if (!editor) return null

	return (
		<EditorContext.Provider value={providerValue}>
			<EditorContent editor={editor} />
			<LinkHoverCard editor={editor} />
		</EditorContext.Provider>
	)
}
