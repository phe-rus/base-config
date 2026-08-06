import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer
} from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { CodeBlockCopyButton } from './code-block-copy-button'

/**
 * The editor's own `codeBlock` view: everything `CodeBlockLowlight` already
 * does (live-typing syntax highlighting via its own ProseMirror decoration
 * plugin, tab indentation, exit-on-arrow-down) is untouched, `NodeViewContent`
 * below is the real, ProseMirror-managed `contentDOM` that plugin decorates,
 * this only adds a copy button as a sibling, positioned over the block.
 */
function CodeBlockEditableView({ node }: NodeViewProps) {
	return (
		<NodeViewWrapper
			className='code-block-editable group relative'
			data-language={(node.attrs.language as string | null) ?? undefined}
		>
			<CodeBlockCopyButton getText={() => node.textContent} />
			<pre>
				<NodeViewContent<'code'> as='code' />
			</pre>
		</NodeViewWrapper>
	)
}

export const CodeBlockEditable = CodeBlockLowlight.extend({
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockEditableView)
	}
})
