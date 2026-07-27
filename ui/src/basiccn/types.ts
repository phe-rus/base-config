import type { Content } from '@tiptap/react'
import type { ComponentProps } from 'react'

export type BasiccnContent = Content
export type EditorProps = {
	value?: BasiccnContent
	onChange?: (value: BasiccnContent) => void
	placeholder?: string
	className?: string
	contentClass?: string
} & Omit<
	ComponentProps<'div'>,
	'value' | 'onChange' | 'placeholder' | 'className'
>
export interface PreviewProps {
	content?: BasiccnContent
	className?: string
}
