// The single upload implementation for every `upload` field, across every
// collection — no more per-collection `fileToBase64`. Posts to the
// consumer's own `/api/storage/upload` (the convention `@base/config`'s own
// Hono scaffolding — see `api/ignite.ts` — assumes any consumer mounts its
// storage route at, matching how `db/collections.ts`'s `authClient`
// assumes `adminClient()`'s conventional endpoints). `prefix` becomes the
// storage key's namespace (`${prefix}/${file.name}`) — e.g. a `posts`
// document passes its own slug so its uploads land under `posts/<slug>/`
// instead of the site's storage root.
export async function uploadFile(file: File, prefix?: string): Promise<string> {
	const body = new FormData()
	body.append('file', file)
	if (prefix) body.append('prefix', prefix)

	const response = await fetch('/api/storage/upload', {
		method: 'POST',
		body,
		credentials: 'include'
	})
	if (!response.ok) {
		throw new Error(`Failed to upload "${file.name}" (${response.status})`)
	}
	const { url } = (await response.json()) as { url: string }
	return url
}
