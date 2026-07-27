import { buttonVariants } from '@pherus/ui/components/button'
import { cn } from '@pherus/ui/lib/utils'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { uploadFile } from '../../../fields/upload'
import {
	deleteStorageFile,
	deleteStorageFolder,
	fetchStorageList,
	pathSegmentsOf,
	type StorageListing
} from '../../../fields/storage-client'
import { RenderView } from '../render-view'

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)$/i

/**
 * The media library — lists folders/files from the consumer's own
 * `/api/storage/list` (the same convention `uploadFile()` assumes for
 * `/api/storage/upload`). Navigation is search-param based (`?path=...`)
 * rather than nested dynamic route segments, since folder depth is
 * arbitrary and this is a fully generic library component mounted directly
 * as a route's `component` — same reasoning as every other page here for
 * using `useSearch`/`useNavigate` loosely instead of the consumer's own
 * generated route types.
 */
export function Storage() {
	const search = useSearch({ strict: false }) as { path?: string }
	const navigate = useNavigate()
	const path = search.path ?? ''

	const [data, setData] = useState<StorageListing | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [deletingKey, setDeletingKey] = useState<string | null>(null)

	const load = () => {
		setLoading(true)
		setError(null)
		fetchStorageList(path)
			.then(setData)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err))
			)
			.finally(() => setLoading(false))
	}

	useEffect(load, [path])

	const goToPath = (nextPath: string) => {
		navigate({ search: { path: nextPath } as any })
	}

	const goToFolder = (folder: string) => {
		goToPath(path ? `${path}/${folder}` : folder)
	}

	const handleUpload = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return
		setUploading(true)
		try {
			await Promise.all(
				Array.from(fileList).map((file) => uploadFile(file, path))
			)
			load()
		} finally {
			setUploading(false)
		}
	}

	const handleDeleteFile = async (key: string) => {
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

	const handleDeleteFolder = async (folder: string) => {
		const folderPath = path ? `${path}/${folder}` : folder
		setDeletingKey(folderPath)
		try {
			await deleteStorageFolder(folderPath)
			load()
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setDeletingKey(null)
		}
	}

	return (
		<RenderView>
			<RenderView.Header title='Storage'>
				<label
					className={cn(
						buttonVariants({ size: 'xs', variant: 'secondary' }),
						'cursor-pointer'
					)}
				>
					{uploading ? 'Uploading…' : 'Upload'}
					<input
						type='file'
						multiple
						className='hidden'
						disabled={uploading}
						onChange={(e) => handleUpload(e.target.files)}
					/>
				</label>
			</RenderView.Header>

			<RenderView.Breadcrumb
				rootLabel='Storage'
				path={path}
				segments={pathSegmentsOf(path)}
				onNavigate={goToPath}
			/>

			{error && (
				<p className='text-destructive text-xs'>Failed to load: {error}</p>
			)}

			{loading ? (
				<p className='text-muted-foreground text-xs'>Loading…</p>
			) : (
				<>
					{!!data?.folders.length && (
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
							{data.folders.map((folder) => (
								<RenderView.FolderCard
									key={folder}
									name={folder}
									onOpen={() => goToFolder(folder)}
									onDelete={() => handleDeleteFolder(folder)}
									deleting={
										deletingKey === (path ? `${path}/${folder}` : folder)
									}
								/>
							))}
						</div>
					)}
					{!!data?.files.length && (
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
							{data.files.map((file) => (
								<RenderView.FileCard
									key={file.key}
									name={file.name}
									url={file.url}
									isImage={IMAGE_EXTENSIONS.test(file.name)}
									meta={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
									onDelete={() => handleDeleteFile(file.key)}
									deleting={deletingKey === file.key}
								/>
							))}
						</div>
					)}
					{data && data.folders.length === 0 && data.files.length === 0 && (
						<p className='text-muted-foreground text-xs'>Nothing here yet.</p>
					)}
				</>
			)}
		</RenderView>
	)
}
