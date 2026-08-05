import type { Content } from '@tiptap/react'
import type { ComponentProps, ReactNode } from 'react'

export type BasiccnContent = Content

/** A picked/uploaded media object, the same shape `StorageWidget`'s `onSelect` emits. */
export type EditorUploadValue = { url: string; name: string; size: number }

/** The "choose existing, or upload a new one" media browser, injected so this package stays backend-free (see `StorageWidget` in `@baseconfig/core`). */
export type EditorBrowserProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSelect: (value: EditorUploadValue) => void
}

export type EditorProps = {
	value?: BasiccnContent
	onChange?: (value: BasiccnContent) => void
	placeholder?: string
	className?: string
	contentClass?: string
	/** Uploads an image file to media storage and resolves to its URL, see `uploadFile` in `@baseconfig/core`. Used for direct uploads and pasted/dropped images; falls back to an embedded base64 data URL when omitted or on failure. */
	onUpload?: (file: File) => Promise<string>
	/** Renders the media browser (upload + pick existing) given open state and a select callback. Omit to hide the "choose from existing" affordance. */
	renderBrowser?: (props: EditorBrowserProps) => ReactNode
} & Omit<
	ComponentProps<'div'>,
	'value' | 'onChange' | 'placeholder' | 'className'
>
export interface PreviewProps {
	content?: BasiccnContent
	className?: string
}
