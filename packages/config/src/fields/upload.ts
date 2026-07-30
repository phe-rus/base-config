import { requireStorageDataSource } from './storage-client'

// The single upload implementation for every `upload` field, across every
// collection — no more per-collection `fileToBase64`. Goes through the same
// registered `StorageApiClient` `storage-client.ts`'s other functions use,
// never `fetch` directly. `prefix` becomes the storage key's namespace
// (`${prefix}/${file.name}`) — e.g. a `posts` document passes its own slug
// so its uploads land under `posts/<slug>/` instead of the site's storage
// root.
export async function uploadFile(file: File, prefix?: string): Promise<string> {
	const { url } = await requireStorageDataSource().upload(file, prefix)
	return url
}
