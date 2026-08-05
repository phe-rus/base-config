import { cn } from '../../lib/utils'
import { IconPhotoUp } from '@tabler/icons-react'
import { Button } from '../../components/button'
import TiptapImage, { type ImageOptions } from '@tiptap/extension-image'
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type ReactNodeViewProps
} from '@tiptap/react'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { EditorBrowserProps } from '../types'
import { resolveImageUrl, toAbsoluteUrl } from '../utils/image'

type ImageNodeOptions = Partial<ImageOptions> & {
	onUpload?: (file: File) => Promise<string>
	renderBrowser?: (props: EditorBrowserProps) => ReactNode
}

export const ImageNode = TiptapImage.extend<ImageNodeOptions>({
	addOptions() {
		return {
			...this.parent?.(),
			onUpload: undefined,
			renderBrowser: undefined
		}
	},
	addNodeView() {
		return ReactNodeViewRenderer((props) => (
			<ImageNodeView
				{...props}
				onUpload={this.options.onUpload}
				renderBrowser={this.options.renderBrowser}
			/>
		))
	}
})

function ImageNodeView({
	node,
	updateAttributes,
	editor,
	selected,
	onUpload,
	renderBrowser
}: ReactNodeViewProps & {
	onUpload?: (file: File) => Promise<string>
	renderBrowser?: (props: EditorBrowserProps) => ReactNode
}) {
	const [isDragging, setIsDragging] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [browserOpen, setBrowserOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const src = node.attrs.src as string | null

	const setImage = (url: string, name?: string) => {
		updateAttributes({
			src: toAbsoluteUrl(url),
			alt: (node.attrs.alt as string | null) || name || null
		})
	}

	const handleFile = async (file: File | null | undefined) => {
		if (!file || !file.type.startsWith('image/')) return
		setIsLoading(true)
		try {
			setImage(await resolveImageUrl(file, onUpload), file.name)
		} finally {
			setIsLoading(false)
		}
	}

	const openPicker = () => {
		if (renderBrowser) setBrowserOpen(true)
		else inputRef.current?.click()
	}

	if (!src) {
		return (
			<>
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
						if (editor.isEditable) openPicker()
					}}
					onDragOver={(event: DragEvent) => {
						event.preventDefault()
						if (editor.isEditable) setIsDragging(true)
					}}
					onDragLeave={() => setIsDragging(false)}
					onDrop={(event: DragEvent) => {
						event.preventDefault()
						event.stopPropagation()
						setIsDragging(false)
						if (editor.isEditable) openPicker()
					}}
				>
					<IconPhotoUp className='size-8 text-muted-foreground' />
					<div className='text-xs text-muted-foreground'>
						{isLoading ? (
							'Uploading…'
						) : editor.isEditable ? (
							<span className='font-medium text-foreground'>
								Choose an image
							</span>
						) : (
							'No image'
						)}
					</div>
					{editor.isEditable ? (
						<div className='flex items-center gap-2'>
							<Button
								type='button'
								size='sm'
								variant='secondary'
								disabled={isLoading}
								onClick={(event) => {
									event.stopPropagation()
									inputRef.current?.click()
								}}
							>
								Upload
							</Button>
							{renderBrowser && (
								<Button
									type='button'
									size='sm'
									variant='default'
									disabled={isLoading}
									onClick={(event) => {
										event.stopPropagation()
										setBrowserOpen(true)
									}}
								>
									Choose from existing
								</Button>
							)}
						</div>
					) : null}
					{editor.isEditable ? (
						<input
							ref={inputRef}
							type='file'
							accept='image/*'
							className='hidden'
							onChange={(event) => {
								handleFile(event.target.files?.[0])
								event.target.value = ''
							}}
						/>
					) : null}
				</NodeViewWrapper>
				{renderBrowser
					? renderBrowser({
							open: browserOpen,
							onOpenChange: setBrowserOpen,
							onSelect: (value) => {
								setBrowserOpen(false)
								setImage(value.url, value.name)
							}
						})
					: null}
			</>
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
