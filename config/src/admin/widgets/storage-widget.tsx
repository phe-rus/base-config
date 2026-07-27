import { Button } from '@pherus/ui/components/button'
import { Input } from '@pherus/ui/components/input'
import { cn } from '@pherus/ui/lib/utils'
import { IconFile, IconMinus, IconUpload } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import {
	deleteStorageFile,
	fetchAllStorageFiles,
	type StorageListing
} from '../../fields/storage-client'
import { uploadFile } from '../../fields/upload'
import { WidgetDialog } from './widget-dialog'

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)$/i

export type StorageWidgetValue = { url: string; name: string; size: number }

/** The shape `Upload`'s own `renderBrowser` prop passes in — split out so call sites (`fields/renderer.tsx`, `meta-fields.tsx`) can type that render function's parameter without `f: any`'s lack of inference leaving it an implicit `any`. */
export type StorageWidgetTriggerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSelect: (value: StorageWidgetValue) => void
}

export type StorageWidgetProps = StorageWidgetTriggerProps & {
	/** Where a new drag-and-dropped upload lands by default — the owning field's own folder (collection slug + document id + optional field `prefix`, see `fields/renderer.tsx`). Shown as an editable field so a different destination can be typed in before uploading. */
	defaultFolder?: string
	accept?: string
}

function fileNameAndFolder(key: string) {
	const slash = key.lastIndexOf('/')
	return slash === -1
		? { name: key, folder: '' }
		: { name: key.slice(slash + 1), folder: key.slice(0, slash) }
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The `Upload` field's "choose existing, or drag-and-drop a new one" picker
 * — injected into `@base/ui/forms`'s `Upload` primitive via its
 * `renderBrowser` prop, so that package stays free of any real backend
 * dependency (this is the one place in `@base/config` that knows about
 * `/api/storage/*`, alongside `admin/views/storage/component.tsx`).
 * Browses every file as one flat list rather than folder-by-folder — the
 * full Storage page keeps folder browsing, this is just quick picking.
 * Lives under `admin/widgets/`, not `fields/`, alongside `AuthWidget` — the
 * one deliberate exception to `fields/` never depending on `admin/` in
 * reverse: both widgets share `WidgetDialog`'s chrome, and this is the more
 * natural home for that than either widget's original location.
 */
export function StorageWidget({
	open,
	onOpenChange,
	onSelect,
	defaultFolder,
	accept
}: StorageWidgetProps) {
	const [uploadFolder, setUploadFolder] = useState(defaultFolder ?? '')
	const [data, setData] = useState<StorageListing | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [dragActive, setDragActive] = useState(false)
	const [deletingKey, setDeletingKey] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// Every fresh open resumes at the field's own folder — otherwise
	// re-opening later would resume wherever a previous session left off.
	useEffect(() => {
		if (open) setUploadFolder(defaultFolder ?? '')
	}, [open, defaultFolder])

	const load = () => {
		setLoading(true)
		setError(null)
		fetchAllStorageFiles()
			.then(setData)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err))
			)
			.finally(() => setLoading(false))
	}

	useEffect(() => {
		if (open) load()
	}, [open])

	const handleFiles = async (fileList: FileList | null) => {
		const file = fileList?.[0]
		if (!file) return
		setUploading(true)
		try {
			const url = await uploadFile(file, uploadFolder || undefined)
			onSelect({ url, name: file.name, size: file.size })
		} finally {
			setUploading(false)
		}
	}

	const handleDelete = async (key: string) => {
		setDeletingKey(key)
		try {
			await deleteStorageFile(key)
			load()
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setDeletingKey(null)
		}
	}

	return (
		<WidgetDialog
			open={open}
			onOpenChange={onOpenChange}
			title='Choose an image'
			description='Pick an existing file below, or drag and drop a new one to upload.'
		>
			<button
				type='button'
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault()
					setDragActive(true)
				}}
				onDragLeave={() => setDragActive(false)}
				onDrop={(e) => {
					e.preventDefault()
					setDragActive(false)
					handleFiles(e.dataTransfer.files)
				}}
				disabled={uploading}
				className={cn(
					'flex flex-col rounded-md border-dashed shadow-sm shadow-accent/15',
					'z-10 backdrop-blur border p-10 cursor-pointer hover:shadow-2xl hover:shadow-accent/45',
					dragActive ? 'border-primary bg-primary/5' : 'border-border/95',
					uploading && 'opacity-60'
				)}
			>
				<div className='flex flex-col items-center justify-center gap-1'>
					<IconUpload className='size-5 text-muted-foreground' />
					<span className='text-xs'>
						{uploading ? 'Uploading…' : 'Drag & drop, or click to upload'}
					</span>
				</div>
				<input
					ref={inputRef}
					type='file'
					accept={accept}
					className='hidden'
					onChange={(e) => {
						handleFiles(e.target.files)
						e.target.value = ''
					}}
				/>
			</button>

			<label className='flex flex-col gap-1'>
				<span className='text-[10px] text-muted-foreground'>Upload folder</span>
				<Input
					value={uploadFolder}
					onChange={(e) => setUploadFolder(e.target.value)}
					placeholder='e.g. pages/avatar'
					className='h-7 text-xs'
				/>
			</label>

			{error && (
				<p className='text-destructive text-xs'>Failed to load: {error}</p>
			)}

			{loading ? (
				<p className='text-muted-foreground text-xs'>Loading…</p>
			) : (
				<div className='flex flex-col gap-2'>
					{data?.files.map((file) => {
						const { name, folder } = fileNameAndFolder(file.key)
						return (
							<div
								key={file.key}
								className={cn(
									'flex items-center gap-2 rounded-md border',
									'border-border/55 leading-none'
								)}
							>
								<button
									type='button'
									title={file.name}
									onClick={() =>
										onSelect({
											url: file.url,
											name,
											size: file.size
										})
									}
									className='flex min-w-0 flex-1 items-center gap-2 text-left'
								>
									{IMAGE_EXTENSIONS.test(name) ? (
										<img
											src={file.url}
											alt={name}
											className={cn(
												'h-10 shrink-0 rounded object-cover',
												'aspect-video'
											)}
										/>
									) : (
										<div
											className={cn(
												'flex size-10 shrink-0 items-center',
												'justify-center rounded bg-muted'
											)}
										>
											<IconFile className='size-4 text-muted-foreground' />
										</div>
									)}
									<div className='flex min-w-0 flex-col'>
										<span className='truncate text-xs'>{name}</span>
										<span className='truncate text-[10px] text-muted-foreground'>
											{folder ? `${folder} · ` : ''}
											{formatBytes(file.size)}
										</span>
									</div>
								</button>
								<Button
									type='button'
									title='Delete'
									size='icon-xs'
									variant='destructive'
									className='shrink-0 rounded-full mr-2'
									disabled={deletingKey === file.key}
									onClick={() => handleDelete(file.key)}
								>
									<IconMinus />
								</Button>
							</div>
						)
					})}
					{data && data.files.length === 0 && (
						<p className='text-muted-foreground text-xs'>Nothing here yet.</p>
					)}
				</div>
			)}
		</WidgetDialog>
	)
}
