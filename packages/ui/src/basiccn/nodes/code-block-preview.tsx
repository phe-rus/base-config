import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer
} from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { CodeBlockCopyButton } from './code-block-copy-button'

/**
 * `Preview`'s own read-only rendering of a `codeBlock`. Built from
 * `CodeBlockLowlight` (not the plain `CodeBlock`), and deliberately keeps a
 * **real** `contentDOM` (`NodeViewContent` below): an earlier version of
 * this replaced the entire DOM with custom-rendered, per-line-highlighted
 * spans, which broke native text selection, ProseMirror treats a NodeView
 * with no `contentDOM` as opaque for selection purposes, the same way you
 * can't text-select inside an image node. Keeping the real contentDOM means
 * `CodeBlockLowlight`'s own highlight-via-decoration plugin (the exact
 * mechanism the editable editor already uses) highlights this too, for
 * free, correctly across multi-line constructs a per-line approach
 * couldn't, and native browser selection/copy over the actual text keeps
 * working.
 *
 * Line numbers are a **separate sibling gutter**, not interleaved into the
 * content: counted from `node.textContent.split('\n').length` and rendered
 * as their own column next to (not inside) the real code text. This is
 * deliberate, not incidental, splitting the text itself into per-line DOM
 * nodes is exactly what broke selection the first time; a gutter that's
 * merely visually adjacent, kept in sync by matching `line-height` (see
 * `www/src/styles/typeset.css`), never needs to touch the actual content.
 */
function CodeBlockPreviewView({ node }: NodeViewProps) {
	const code = node.textContent
	const lineCount = code.length === 0 ? 1 : code.split('\n').length
	const language = (node.attrs.language as string | null) ?? undefined

	return (
		<NodeViewWrapper
			as='pre'
			className='code-block-preview group relative'
			data-language={language}
		>
			<CodeBlockCopyButton getText={() => code} />
			<span className='code-block-gutter' aria-hidden='true'>
				{Array.from({ length: lineCount }, (_, i) => (
					<span className='code-block-line-number' key={i}>
						{i + 1}
					</span>
				))}
			</span>
			<NodeViewContent<'code'> as='code' className='code-block-preview-code' />
		</NodeViewWrapper>
	)
}

export const CodeBlockPreview = CodeBlockLowlight.extend({
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockPreviewView)
	}
})
