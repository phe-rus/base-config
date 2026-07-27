import { Button } from '../../../components/button'
import { cn } from '../../../lib/utils'
import { IconFile, IconLoader2, IconPhoto, IconX } from '@tabler/icons-react'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

export type UploadValue = {
	url: string
	name: string
	size: number
}

type UploadProps = BaseFieldProps & {
	accept?: string
	/** Uploads the file and resolves to the stored object key (or a data URL) — the field packs that together with the picked `File`'s own name/size into its value, so both persist across reloads (unlike local-only component state). */
	onUpload: (file: File) => Promise<string>
	/**
	 * Renders the "choose existing" experience (a media browser) given the
	 * picker's open state and a `select` callback that commits a pick and
	 * closes it. Kept as an injected render function rather than a fixed
	 * component so this package stays free of any real backend/storage
	 * dependency — the actual browser UI (fetching a file listing, uploading,
	 * etc.) lives in the consumer, e.g. `@base/config`'s `MediaPickerDrawer`.
	 * Omit to skip the "choose from existing" affordance entirely.
	 */
	renderBrowser?: (props: {
		open: boolean
		onOpenChange: (open: boolean) => void
		onSelect: (value: UploadValue) => void
	}) => ReactNode
}

function isImageValue(value: UploadValue | undefined, accept?: string) {
	return (
		!!value &&
		(value.url.startsWith('data:image') || !!accept?.includes('image'))
	)
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const Upload = ({
	label,
	description,
	required,
	accept,
	disabled,
	onUpload,
	renderBrowser
}: UploadProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<UploadValue | undefined>()
	const [isUploading, setIsUploading] = useState(false)
	const [browserOpen, setBrowserOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const pick = () => {
		if (disabled || isUploading) return
		inputRef.current?.click()
	}

	const browse = (e?: MouseEvent) => {
		e?.stopPropagation()
		if (disabled || isUploading) return
		setBrowserOpen(true)
	}

	const clear = (e: MouseEvent) => {
		e.stopPropagation()
		handleChange(undefined)
	}

	const selectExisting = (picked: UploadValue) => {
		handleChange(picked)
		setBrowserOpen(false)
	}

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<input
				ref={inputRef}
				id={name}
				name={name}
				type='file'
				accept={accept}
				disabled={disabled || isUploading}
				aria-invalid={isInvalid}
				className='sr-only'
				onBlur={handleBlur}
				onChange={async (e) => {
					const file = e.target.files?.[0]
					e.target.value = ''
					if (!file) return
					setIsUploading(true)
					try {
						const url = await onUpload(file)
						handleChange({ url, name: file.name, size: file.size })
					} finally {
						setIsUploading(false)
					}
				}}
			/>

			{value ? (
				<div
					role='button'
					tabIndex={0}
					onClick={pick}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') pick()
					}}
					title='Click to replace'
					className={cn(
						'relative flex items-center gap-2 w-full max-w-full rounded',
						'bg-input/35 border border-border/35 cursor-pointer',
						'shadow-sm hover:shadow-md transition-shadow',
						'overflow-hidden flex-1'
					)}
				>
					{isImageValue(value, accept) ? (
						<img
							src={value.url}
							alt={value.name}
							className='w-auto h-12 shrink-0 rounded'
						/>
					) : (
						<div className='size-5 rounded-sm bg-muted flex items-center justify-center shrink-0'>
							<IconFile className='size-3 text-muted-foreground' />
						</div>
					)}
					<div className='flex flex-col min-w-0'>
						<span className='truncate text-xs'>{value.name}</span>
						<span className='text-muted-foreground text-xs'>
							{formatBytes(value.size)}
						</span>
					</div>
					<div className='absolute flex right-2 items-center gap-px'>
						{renderBrowser && (
							<Button
								type='button'
								title='Choose from existing'
								size='icon-xs'
								variant='secondary'
								disabled={disabled}
								className='rounded-full shrink-0'
								onClick={browse}
							>
								<IconPhoto />
							</Button>
						)}
						<Button
							type='button'
							title='Remove'
							size='icon-xs'
							variant='destructive'
							disabled={disabled}
							className='rounded-full shrink-0'
							onClick={clear}
						>
							<IconX />
						</Button>
					</div>
					{isUploading && (
						<span
							className={cn(
								'absolute inset-0 flex items-center justify-center',
								'bg-background/70 text-xs rounded-full'
							)}
						>
							<IconLoader2 className='animate-spin size-4' />
						</span>
					)}
				</div>
			) : (
				<div
					role='button'
					tabIndex={0}
					onClick={pick}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') pick()
					}}
					aria-disabled={disabled || isUploading}
					className={cn(
						'relative flex items-center gap-2 min-w-full rounded',
						'bg-input/35 border border-border/35 cursor-pointer',
						'shadow-sm hover:shadow-md transition-shadow',
						'overflow-hidden',
						(disabled || isUploading) && 'pointer-events-none opacity-60'
					)}
				>
					<img
						src='/favicon.png'
						alt='placeholder'
						className='size-12 shrink-0 rounded-none'
					/>
					<div className='flex flex-col items-start'>
						<h3 className='text-sm font-semibold'>Upload a new image</h3>
						<p className='text-muted-foreground text-[10px]'>
							PNG, JPG, or GIF.
						</p>
					</div>
					<div className='absolute right-5 flex items-center gap-1'>
						<Button
							disabled={isUploading}
							type='button'
							size='sm'
							variant='secondary'
							onClick={(e: MouseEvent) => {
								e.stopPropagation()
								pick()
							}}
						>
							Upload
						</Button>
						{renderBrowser && (
							<Button
								type='button'
								size='sm'
								variant='default'
								onClick={browse}
							>
								Choose from existing
							</Button>
						)}
					</div>
				</div>
			)}

			{renderBrowser?.({
				open: browserOpen,
				onOpenChange: setBrowserOpen,
				onSelect: selectExisting
			})}
		</FieldShell>
	)
}
