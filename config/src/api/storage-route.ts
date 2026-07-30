import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { purgeCdnCache } from './cdn-route'

type SessionLike = { user: { role?: string | null } }

type StorageRouteEnv = { Variables: { session?: SessionLike } }

export type StorageRouteType = ReturnType<typeof createStorageRoute>

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

type R2ObjectBodyLike = {
	body: ReadableStream | null
	httpEtag: string
	writeHttpMetadata: (headers: Headers) => void
}

/**
 * The exact slice of Cloudflare's real `R2Bucket` this route (and
 * `cdn-route.ts`'s `createCdnRoute`, which only needs `get`) calls —
 * structural on purpose (same trade-off `BetterAuthAdminClient` makes for
 * better-auth), so this package never needs `@cloudflare/workers-types` as
 * a dependency just for one binding's ambient type. A consumer's real
 * `env.MEDIA` (an actual `R2Bucket`) satisfies this without a cast. `get`
 * is unused by this file's own routes — kept on the one shared type rather
 * than a second near-duplicate, since both routes are always handed the
 * same real bucket binding by `createBaseConfigRoute`.
 */
export type R2BucketLike = {
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
	get: (key: string) => Promise<R2ObjectBodyLike | null>
}

/**
 * The media-library API — factored out the same way `db/content-route.ts`
 * is: a plain Hono app a consumer mounts directly
 * (`.route('/storage', createStorageRoute(env.MEDIA))` in their own
 * `api.ts`), taking the consumer's own R2 bucket binding directly rather
 * than reading `env` itself. `session` is read structurally off the Hono
 * context, same auth-agnostic trade-off `content-route.ts`/`guard.ts`/
 * `Topbar` already make.
 *
 * **One chained expression, never a bare `app.get(...)` statement** — see
 * `content-route.ts`'s own doc comment for exactly why: Hono's RPC type
 * inference only accumulates route information through each call's
 * *return value*, so a route added via its own separate statement (return
 * value discarded) is invisible to a consumer's `hc<TypeRouter>()` client
 * even though the server itself works fine. Real bug in an earlier
 * version of this file.
 */
const listQuerySchema = z.object({
	flat: z.string().optional(),
	path: z.string().optional()
})
const fileQuerySchema = z.object({ key: z.string() })
const folderQuerySchema = z.object({ path: z.string() })
const uploadFormSchema = z.object({
	file: z.instanceof(File),
	prefix: z.string().optional()
})

/**
 * **Every query param this route reads goes through `zValidator('query', ...)`
 * now** — an earlier version read `c.req.query(...)` directly with no
 * validator. That still works as a *server*, but Hono's `hc<TypeRouter>()`
 * client only infers a typed `query` argument for `$get`/`$delete` from a
 * route's own validator; without one, a consumer's RPC client has no way to
 * pass `path`/`flat`/`key` at all. Same class of fix as `content-route.ts`'s
 * own chaining fix, just for query params instead of route chaining.
 */
export function createStorageRoute(bucket: R2BucketLike) {
	const app = new Hono<StorageRouteEnv>()
		.use('*', async (c, next) => {
			const session = c.get('session')
			if (!session || session.user.role !== 'admin') {
				return c.text('Unauthorized', 401)
			}
			await next()
		})
		// Folders and files under `prefix`, matching R2's own "directory"
		// convention (`delimiter: '/'`) — `delimitedPrefixes` are the
		// immediate subfolders, `objects` are the files sitting directly in
		// this folder (not in one of those subfolders). No pagination yet —
		// fine for a media library this size, revisit if `truncated` ever
		// comes back `true` in practice.
		.get('/list', zValidator('query', listQuerySchema), async (c) => {
			// `?flat=true` is the `Upload` field's media picker — it browses
			// every file across every folder as one pool (no folder
			// grouping), unlike the full Storage page's own
			// folder-by-folder browsing below.
			const { flat, path: queryPath } = c.req.valid('query')
			if (flat === 'true') {
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
							url: `/api/cdn/${object.key}`
						}))
					)
					cursor = result.truncated ? result.cursor : undefined
				} while (cursor)

				return c.json({ folders: [], files })
			}

			const path = queryPath ?? ''
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
				url: `/api/cdn/${object.key}`
			}))

			return c.json({ folders, files })
		})
		.post('/upload', zValidator('form', uploadFormSchema), async (c) => {
			const { file, prefix = '' } = c.req.valid('form')

			const key = prefix
				? `${prefix.replace(/\/+$/, '')}/${file.name}`
				: file.name
			await bucket.put(key, await file.arrayBuffer(), {
				httpMetadata: { contentType: file.type }
			})

			return c.json({ key, url: `/api/cdn/${key}` })
		})
		.delete('/file', zValidator('query', fileQuerySchema), async (c) => {
			const { key } = c.req.valid('query')
			await bucket.delete(key)
			await purgeCdnCache(new URL(c.req.url).origin, key)
			return c.json({ ok: true })
		})
		.delete('/folder', zValidator('query', folderQuerySchema), async (c) => {
			const { path } = c.req.valid('query')
			const prefix = `${path.replace(/\/+$/, '')}/`
			const origin = new URL(c.req.url).origin

			// A "folder" is only ever inferred from key prefixes (R2 has no
			// real directory objects) — deleting every object under it is
			// what makes it disappear from a `list()` call, no separate
			// cleanup needed. Paginate via `cursor` since a folder can hold
			// more than one page of objects, and batch deletes at 1000 keys
			// (R2's own per-call limit).
			let cursor: string | undefined
			let deleted = 0
			do {
				const result = await bucket.list({ prefix, cursor })
				if (result.objects.length) {
					await bucket.delete(result.objects.map((object) => object.key))
					await Promise.all(
						result.objects.map((object) => purgeCdnCache(origin, object.key))
					)
					deleted += result.objects.length
				}
				cursor = result.truncated ? result.cursor : undefined
			} while (cursor)

			return c.json({ ok: true, deleted })
		})

	return app
}
