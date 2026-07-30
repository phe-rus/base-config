export type StorageFile = {
	name: string
	key: string
	size: number
	uploadedAt: string
	url: string
}

export type StorageListing = { folders: string[]; files: StorageFile[] }

/** What every `storage-route.ts` response resolves to, whether it came from `fetch`'s own `Response` or Hono's own `ClientResponse` wrapper — both satisfy this shape. Same trade-off `db/collections.ts`'s own `JsonClientResponse` makes. */
type JsonClientResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/**
 * The exact shape `hc<TypeRouter>()`'s own client produces for
 * `storage-route.ts`'s routes, once a consumer has mounted it (e.g.
 * `route.api.storage`) — structural, not `typeof route.api.storage` itself,
 * for the same reason `db/collections.ts`'s `ContentRpcClient` is
 * structural. `query`/`form` are required (not optional) on the client
 * because Hono's own generated type makes them so once a route has a real
 * `zValidator` behind it — see `storage-route.ts`'s own doc comment for why
 * every query param there now goes through one.
 */
export type StorageRpcClient = {
	list: {
		$get: (args: {
			query: { flat?: string; path?: string }
		}) => Promise<JsonClientResponse>
	}
	upload: {
		$post: (args: {
			form: { file: File; prefix?: string }
		}) => Promise<JsonClientResponse>
	}
	file: {
		$delete: (args: { query: { key: string } }) => Promise<JsonClientResponse>
	}
	folder: {
		$delete: (args: { query: { path: string } }) => Promise<JsonClientResponse>
	}
}

export type StorageApiClient = {
	list: (path: string) => Promise<StorageListing>
	/** Every file across every folder, as one flat pool — see `fetchAllStorageFiles`'s own doc comment below for who uses this. */
	listAll: () => Promise<StorageListing>
	upload: (file: File, prefix?: string) => Promise<{ key: string; url: string }>
	deleteFile: (key: string) => Promise<void>
	deleteFolder: (path: string) => Promise<void>
}

async function unwrapJson<T>(res: JsonClientResponse): Promise<T> {
	const body = await res.json()
	if (!res.ok) {
		const message =
			typeof body === 'object' && body && 'error' in body
				? String((body as { error: unknown }).error)
				: `Request failed (${res.status})`
		throw new Error(message)
	}
	return body as T
}

/**
 * Builds a real `StorageApiClient` from a consumer's own mounted Hono RPC
 * sub-client (e.g. `route.api.storage`) — same "library does the wiring,
 * consumer passes one already-typed object" shape as
 * `db/collections.ts`'s `createContentApiClient`. Never uses `fetch`
 * directly.
 */
export function createStorageApiClient(
	client: StorageRpcClient
): StorageApiClient {
	return {
		list: async (path) => {
			const res = await client.list.$get({ query: { path } })
			return unwrapJson(res)
		},
		listAll: async () => {
			const res = await client.list.$get({ query: { flat: 'true' } })
			return unwrapJson(res)
		},
		upload: async (file, prefix) => {
			const res = await client.upload.$post({ form: { file, prefix } })
			return unwrapJson(res)
		},
		deleteFile: async (key) => {
			await client.file.$delete({ query: { key } })
		},
		deleteFolder: async (path) => {
			await client.folder.$delete({ query: { path } })
		}
	}
}

let storageDataSource: StorageApiClient | undefined

/** Call once, client-side — `baseConfig({storageClient: ...})` does this unconditionally, same as `registerContentDataSource`. */
export function registerStorageDataSource(client: StorageApiClient) {
	storageDataSource = client
}

/** Exported for `upload.ts`'s `uploadFile` — everything else in this file keeps calling the un-exported form below directly. */
export function requireStorageDataSource(): StorageApiClient {
	if (!storageDataSource) {
		throw new Error(
			'Storage was used before registerStorageDataSource() was called — see fields/storage-client.ts.'
		)
	}
	return storageDataSource
}

/**
 * Shared behind both the full Storage page (`admin/views/storage/component.tsx`)
 * and the `Upload` field's media picker (`admin/widgets/storage-widget.tsx`)
 * — same `/api/storage/*` conventions `uploadFile` (`./upload.ts`) already
 * assumes.
 */
export async function fetchStorageList(path: string): Promise<StorageListing> {
	return requireStorageDataSource().list(path)
}

/**
 * Every file across every folder, as one flat pool — what the `Upload`
 * field's media-picker drawer browses (unlike the full Storage page's own
 * folder-by-folder `fetchStorageList`). `folders` always comes back empty;
 * kept as `StorageListing` purely so callers can share one type.
 */
export async function fetchAllStorageFiles(): Promise<StorageListing> {
	return requireStorageDataSource().listAll()
}

export async function deleteStorageFile(key: string): Promise<void> {
	return requireStorageDataSource().deleteFile(key)
}

/**
 * Deletes every object under `folderPath` — R2 has no real folder objects, a
 * folder only ever exists as an inferred grouping of keys sharing a prefix
 * (see the API route's own `/list`), so this is what makes an emptied folder
 * disappear from the listing automatically, with no separate "remove empty
 * folder" step needed.
 */
export async function deleteStorageFolder(folderPath: string): Promise<void> {
	return requireStorageDataSource().deleteFolder(folderPath)
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
