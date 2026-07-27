import { Blockquote } from '@tiptap/extension-blockquote'
import { Bold } from '@tiptap/extension-bold'
import { Document } from '@tiptap/extension-document'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Heading } from '@tiptap/extension-heading'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Italic } from '@tiptap/extension-italic'
import { Link } from '@tiptap/extension-link'
import { ListKit } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Strike } from '@tiptap/extension-strike'
import { Text } from '@tiptap/extension-text'
import { Underline } from '@tiptap/extension-underline'
import Typography from '@tiptap/extension-typography'
import { createLowlight, common } from 'lowlight'
import {
	Placeholder,
	Gapcursor,
	CharacterCount,
	Dropcursor,
	UndoRedo
} from '@tiptap/extensions'
import type { AnyExtension } from '@tiptap/react'
import { Code } from '@tiptap/extension-code'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import { cn } from '../../lib/utils'
import { Indent } from './indent'
import { SlashCommand } from '../plugins/slash'
import { ImageNode } from '../nodes/image-node'

const lowlight = createLowlight(common)

export type BasiccnOptions = {
	placeholder?: string
}

export interface BasiccnExtensionsArray extends Array<AnyExtension> {
	configure(options?: BasiccnOptions): AnyExtension[]
}

const buildExtensions = (options?: BasiccnOptions): AnyExtension[] => [
	Document,
	Paragraph,
	Text,
	HardBreak,
	Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
	CodeBlockLowlight.configure({
		lowlight,
		enableTabIndentation: true,
		tabSize: 2,
		exitOnArrowDown: true
	}),
	CharacterCount,
	Dropcursor,
	Subscript,
	Superscript,
	TextAlign.configure({
		types: ['heading', 'paragraph']
	}),
	Gapcursor,
	UndoRedo,
	Typography,
	Code,
	ImageNode,
	Bold,
	Italic,
	Underline,
	Strike,
	Blockquote,
	HorizontalRule,
	Indent,
	SlashCommand,
	TextStyleKit.configure({
		fontSize: false,
		lineHeight: false,
		backgroundColor: false
	}),
	Highlight.configure({ multicolor: true }),
	ListKit,
	Link.configure({
		openOnClick: false,
		autolink: true,
		defaultProtocol: 'https',
		protocols: ['http', 'https', 'mailto']
	}),
	TableKit.configure({
		table: { resizable: true }
	}),
	Placeholder.configure({
		showOnlyWhenEditable: true,
		placeholder: ({ node }) => {
			if (node.type.name === 'heading') {
				return "What's the title?"
			}
			return options?.placeholder ?? 'Write, type "/" for commands...'
		},
		emptyNodeClass: cn(
			'cursor-text before:content-[attr(data-placeholder)] before:absolute',
			'before:text-muted-foreground before:opacity-50 before-pointer-events-none'
		)
	})
]

const defaultExtensions = buildExtensions() as BasiccnExtensionsArray
defaultExtensions.configure = (options?: BasiccnOptions) => {
	return buildExtensions(options)
}
export const BasiccnExtensions = defaultExtensions
