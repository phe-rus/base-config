import type { BasiccnContent } from '@baseconfig/ui/basiccn'
import { Preview } from '@baseconfig/ui/basiccn/preview'
import type { FC } from 'react'

/**
 * Rich text is rendered through the same tiptap `Preview` the editor itself
 * uses, so what you author is what the site shows. Same disclosed
 * SSR-hydration-only gap the library's old default markup carried: `Preview`
 * mounts a real tiptap/ProseMirror `EditorView`, which needs a real DOM
 * (`useEditor`'s `immediatelyRender: false` defers construction to a
 * `useEffect` that never runs server-side), so this block's text is absent
 * from the server-rendered HTML until client JS hydrates. A proper fix is a
 * dependency-free tiptap-JSON to JSX renderer, real scope on its own.
 */
export const RichTextBlock: FC<{ content?: BasiccnContent }> = ({
	content
}) => {
	if (!content) return null
	return <Preview content={content} />
}
