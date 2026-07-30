import { cn } from '../../lib/utils'
import { IconPhotoUp } from '@tabler/icons-react'
import TiptapImage from '@tiptap/extension-image'
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type ReactNodeViewProps
} from '@tiptap/react'
import { useRef, useState, type DragEvent } from 'react'

export const ImageNode = TiptapImage.extend({
	addNodeView() {
		return ReactNodeViewRenderer(ImageNodeView)
	}
})

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

function ImageNodeView({
	node,
	updateAttributes,
	editor,
	selected
}: ReactNodeViewProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const src = node.attrs.src as string | null

	const handleFile = async (file: File | null | undefined) => {
		if (!file || !file.type.startsWith('image/')) return
		setIsLoading(true)
		try {
			const dataUrl = await readFileAsDataUrl(file)
			updateAttributes({ src: dataUrl, alt: node.attrs.alt || file.name })
		} finally {
			setIsLoading(false)
		}
	}

	if (!src) {
		return (
			<NodeViewWrapper
				className={cn(
					'my-2 flex flex-col items-center justify-center gap-2 rounded-lg',
					'border-2 border-dashed border-input/40 bg-input/10 p-8 text-center',
					'transition-colors',
					isDragging && 'border-ring bg-accent/40',
					editor.isEditable && 'cursor-pointer hover:border-input/60'
				)}
				contentEditable={false}
				onClick={() => {
					if (editor.isEditable) inputRef.current?.click()
				}}
				onDragOver={(event: DragEvent) => {
					event.preventDefault()
					if (editor.isEditable) setIsDragging(true)
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(event: DragEvent) => {
					event.preventDefault()
					setIsDragging(false)
					if (editor.isEditable) handleFile(event.dataTransfer.files[0])
				}}
			>
				<IconPhotoUp className='size-8 text-muted-foreground' />
				<div className='text-xs text-muted-foreground'>
					{isLoading ? (
						'Uploading…'
					) : editor.isEditable ? (
						<>
							<span className='font-medium text-foreground'>
								Click to upload
							</span>{' '}
							or drag and drop an image
						</>
					) : (
						'No image'
					)}
				</div>
				{editor.isEditable ? (
					<input
						ref={inputRef}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={(event) => handleFile(event.target.files?.[0])}
					/>
				) : null}
			</NodeViewWrapper>
		)
	}

	return (
		<NodeViewWrapper
			className={cn(
				'relative my-2 w-fit',
				selected && 'rounded-lg ring-2 ring-ring'
			)}
		>
			<img
				src={src}
				alt={(node.attrs.alt as string) ?? ''}
				className='max-w-full rounded-sm'
			/>
		</NodeViewWrapper>
	)
}
