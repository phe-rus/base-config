export type StorageFile = {
	name: string
	key: string
	size: number
	uploadedAt: string
	url: string
}

export type StorageListing = { folders: string[]; files: StorageFile[] }

/**
 * Shared behind both the full Storage page (`admin/views/storage-route-
 * component.tsx`) and the `Upload` field's media picker
 * (`admin/widgets/storage-widget.tsx`) — same `/api/storage/*` conventions
 * `uploadFile` (`./upload.ts`) already assumes.
 */
export async function fetchStorageList(path: string): Promise<StorageListing> {
	const response = await fetch(
		`/api/storage/list?path=${encodeURIComponent(path)}`,
		{ credentials: 'include' }
	)
	if (!response.ok) {
		throw new Error(`Failed to list "${path}" (${response.status})`)
	}
	return response.json()
}

/**
 * Every file across every folder, as one flat pool — what the `Upload`
 * field's media-picker drawer browses (unlike the full Storage page's own
 * folder-by-folder `fetchStorageList`). `folders` always comes back empty;
 * kept as `StorageListing` purely so callers can share one type.
 */
export async function fetchAllStorageFiles(): Promise<StorageListing> {
	const response = await fetch('/api/storage/list?flat=true', {
		credentials: 'include'
	})
	if (!response.ok) {
		throw new Error(`Failed to list storage (${response.status})`)
	}
	return response.json()
}

export async function deleteStorageFile(key: string): Promise<void> {
	const response = await fetch(
		`/api/storage/file?key=${encodeURIComponent(key)}`,
		{
			method: 'DELETE',
			credentials: 'include'
		}
	)
	if (!response.ok) {
		throw new Error(`Failed to delete "${key}" (${response.status})`)
	}
}

/**
 * Deletes every object under `folderPath` — R2 has no real folder objects, a
 * folder only ever exists as an inferred grouping of keys sharing a prefix
 * (see the API route's own `/list`), so this is what makes an emptied folder
 * disappear from the listing automatically, with no separate "remove empty
 * folder" step needed.
 */
export async function deleteStorageFolder(folderPath: string): Promise<void> {
	const response = await fetch(
		`/api/storage/folder?path=${encodeURIComponent(folderPath)}`,
		{ method: 'DELETE', credentials: 'include' }
	)
	if (!response.ok) {
		throw new Error(`Failed to delete "${folderPath}" (${response.status})`)
	}
}

/**
 * Turns a flat `path` (`'home/avatar'`) into breadcrumb segments, each with
 * its own cumulative sub-path (`[{name:'home', path:'home'}, {name:'avatar',
 * path:'home/avatar'}]`) — so navigating to one jumps straight to that
 * depth, not just one level up.
 */
export function pathSegmentsOf(path: string) {
	return path
		.split('/')
		.filter(Boolean)
		.map((name, index, all) => ({
			name,
			path: all.slice(0, index + 1).join('/')
		}))
}
