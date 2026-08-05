import { Button } from '../components/button'
import { cn } from '../lib/utils'
import { IconGripVertical } from '@tabler/icons-react'
import DragHandle from '@tiptap/extension-drag-handle-react'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import { useEffect, useMemo, useRef } from 'react'
import { AddBlockButton } from './components/add-block-button'
import { BubbleMenus } from './components/bubble-menus'
import { LinkHoverCard } from './components/link-hover-card'
import { basiccnTheme } from './theme'
import type { EditorProps } from './types'
import { BasiccnExtensions } from './utils/extensions'
import { handleImageDrop, handleImagePaste } from './utils/image'

export function Editor({
	value,
	onChange,
	placeholder,
	className,
	contentClass,
	onUpload,
	renderBrowser,
	...props
}: EditorProps) {
	const lastEmittedRef = useRef(value)
	const editor = useEditor({
		extensions: BasiccnExtensions.configure({
			placeholder,
			onUpload,
			renderBrowser
		}),
		content: value ?? '',
		editorProps: {
			attributes: {
				class: cn(basiccnTheme, contentClass)
			},
			handlePaste: (view, event) => handleImagePaste(view, event, onUpload),
			handleDrop: (view, event) => handleImageDrop(view, event, onUpload)
		},
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			const json = editor.getJSON()
			lastEmittedRef.current = json
			onChange?.(json)
		}
	})

	useEffect(() => {
		if (!editor) return
		if (
			JSON.stringify(value ?? '') ===
			JSON.stringify(lastEmittedRef.current ?? '')
		)
			return
		lastEmittedRef.current = value
		editor.commands.setContent(value ?? '', {
			emitUpdate: false
		})
	}, [editor, value])

	const providerValue = useMemo(() => ({ editor }), [editor])

	return (
		<EditorContext.Provider value={providerValue}>
			<div
				{...props}
				className={cn('flex w-full flex-col overflow-hidden', className)}
			>
				{editor ? (
					<DragHandle editor={editor}>
						<div className='flex items-center gap-0.5'>
							<AddBlockButton editor={editor} />
							<Button
								size='icon-xs'
								variant='default'
								className='rounded w-fit! inline-block my-auto!'
							>
								<IconGripVertical />
							</Button>
						</div>
					</DragHandle>
				) : null}
				<EditorContent editor={editor} />
				{editor && <BubbleMenus editor={editor} />}
				{editor && <LinkHoverCard editor={editor} />}
			</div>
		</EditorContext.Provider>
	)
}
