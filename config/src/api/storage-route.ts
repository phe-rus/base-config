import { Hono } from 'hono'

type SessionLike = { user: { role?: string | null } }

type StorageRouteEnv = { Variables: { session?: SessionLike } }

type StorageFile = {
	name: string
	key: string
	size: number
	uploadedAt: string
	url: string
}

type R2ObjectLike = { key: string; size: number; uploaded: Date }

type R2ListResultLike = {
	objects: R2ObjectLike[]
	truncated: boolean
	cursor?: string
	delimitedPrefixes?: string[]
}

/**
 * The exact slice of Cloudflare's real `R2Bucket` this route calls —
 * structural on purpose (same trade-off `BetterAuthAdminClient` makes for
 * better-auth), so this package never needs `@cloudflare/workers-types` as
 * a dependency just for one binding's ambient type. A consumer's real
 * `env.MEDIA` (an actual `R2Bucket`) satisfies this without a cast.
 */
type R2BucketLike = {
	list: (options?: {
		prefix?: string
		delimiter?: string
		cursor?: string
	}) => Promise<R2ListResultLike>
	put: (
		key: string,
		value: ArrayBuffer,
		options?: { httpMetadata?: { contentType?: string } }
	) => Promise<unknown>
	delete: (keys: string | string[]) => Promise<void>
}

/**
 * The media-library API — factored out the same way `db/content-route.ts`
 * is: a plain Hono app a consumer mounts directly
 * (`.route('/storage', createStorageRoute(env.MEDIA))` in their own
 * `api.ts`), taking the consumer's own R2 bucket binding directly rather
 * than reading `env` itself (same server-only-binding-isolation reasoning
 * as everywhere else in this package). `session` is read structurally off
 * the Hono context, same auth-agnostic trade-off `content-route.ts`/
 * `guard.ts`/`Topbar` already make.
 */
export function createStorageRoute(bucket: R2BucketLike) {
	const app = new Hono<StorageRouteEnv>()

	app.use('*', async (c, next) => {
		const session = c.get('session')
		if (!session || session.user.role !== 'admin') {
			return c.text('Unauthorized', 401)
		}
		await next()
	})

	// Folders and files under `prefix`, matching R2's own "directory"
	// convention (`delimiter: '/'`) — `delimitedPrefixes` are the immediate
	// subfolders, `objects` are the files sitting directly in this folder
	// (not in one of those subfolders). No pagination yet — fine for a
	// media library this size, revisit if `truncated` ever comes back
	// `true` in practice.
	app.get('/list', async (c) => {
		// `?flat=true` is the `Upload` field's media picker — it browses every
		// file across every folder as one pool (no folder grouping), unlike
		// the full Storage page's own folder-by-folder browsing below.
		if (c.req.query('flat') === 'true') {
			let cursor: string | undefined
			const files: StorageFile[] = []
			do {
				const result = await bucket.list({ cursor })
				files.push(
					...result.objects.map((object) => ({
						name: object.key,
						key: object.key,
						size: object.size,
						uploadedAt: object.uploaded.toISOString(),
						url: `/${object.key}`
					}))
				)
				cursor = result.truncated ? result.cursor : undefined
			} while (cursor)

			return c.json({ folders: [], files })
		}

		const path = c.req.query('path') ?? ''
		const prefix = path ? `${path.replace(/\/+$/, '')}/` : ''
		const result = await bucket.list({ prefix, delimiter: '/' })

		const folders = (result.delimitedPrefixes ?? []).map((full) =>
			full.slice(prefix.length).replace(/\/+$/, '')
		)
		const files = result.objects.map((object) => ({
			name: object.key.slice(prefix.length),
			key: object.key,
			size: object.size,
			uploadedAt: object.uploaded.toISOString(),
			url: `/${object.key}`
		}))

		return c.json({ folders, files })
	})

	app.post('/upload', async (c) => {
		const body = await c.req.parseBody()
		const file = body.file
		const prefix = typeof body.prefix === 'string' ? body.prefix : ''

		if (!(file instanceof File)) {
			return c.json({ error: 'No file provided' }, 400)
		}

		const key = prefix
			? `${prefix.replace(/\/+$/, '')}/${file.name}`
			: file.name
		await bucket.put(key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type }
		})

		return c.json({ key, url: `/${key}` })
	})

	app.delete('/file', async (c) => {
		const key = c.req.query('key')
		if (!key) return c.json({ error: 'Missing key' }, 400)
		await bucket.delete(key)
		return c.json({ ok: true })
	})

	app.delete('/folder', async (c) => {
		const path = c.req.query('path')
		if (!path) return c.json({ error: 'Missing path' }, 400)
		const prefix = `${path.replace(/\/+$/, '')}/`

		// A "folder" is only ever inferred from key prefixes (R2 has no real
		// directory objects) — deleting every object under it is what makes
		// it disappear from a `list()` call, no separate cleanup needed.
		// Paginate via `cursor` since a folder can hold more than one page
		// of objects, and batch deletes at 1000 keys (R2's own per-call
		// limit).
		let cursor: string | undefined
		let deleted = 0
		do {
			const result = await bucket.list({ prefix, cursor })
			if (result.objects.length) {
				await bucket.delete(result.objects.map((object) => object.key))
				deleted += result.objects.length
			}
			cursor = result.truncated ? result.cursor : undefined
		} while (cursor)

		return c.json({ ok: true, deleted })
	})

	return app
}
