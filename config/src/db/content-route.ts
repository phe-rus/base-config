import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import {
	createDocument,
	deleteDocument,
	getDocument,
	getGlobal,
	listDocuments,
	listGlobalSlugs,
	UnknownTableError,
	updateDocument,
	upsertGlobal
} from './content-queries'
import type { ContentDatabase } from './content-queries'

type SessionLike = { user: { role?: string | null } }

type ContentRouteEnv = { Variables: { session?: SessionLike } }

export type ContentRouteType = ReturnType<typeof createContentRoute>

const createDocumentSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	slug: z.string().optional(),
	status: z.enum(['draft', 'published']).optional(),
	data: z.record(z.string(), z.unknown())
})

const updateDocumentSchema = z.object({
	title: z.string().optional(),
	slug: z.string().optional(),
	status: z.enum(['draft', 'published']).optional(),
	fields: z.record(z.string(), z.unknown()).optional()
})

const upsertGlobalSchema = z.record(z.string(), z.unknown())

/**
 * `where` arrives as a JSON-encoded query string (`?where={"status":{"equals":"published"}}`)
 * rather than separate `?status=...`/`?slug=...` params — matches Payload's
 * own REST convention (`?where[status][equals]=published`, here flattened
 * to one param since Hono has no built-in bracket-notation query parser)
 * and keeps this route's query shape extensible without new params per
 * filterable column. Only `status`/`slug` are accepted — see
 * `WhereCondition`'s own doc comment in `content-queries.ts`.
 */
const listQuerySchema = z.object({
	where: z
		.string()
		.optional()
		.transform((value, ctx) => {
			if (!value) return undefined
			try {
				return z
					.object({
						status: z
							.object({ equals: z.enum(['draft', 'published']) })
							.optional(),
						slug: z.object({ equals: z.string() }).optional()
					})
					.parse(JSON.parse(value))
			} catch {
				ctx.addIssue({ code: 'custom', message: 'Invalid `where` filter' })
				return z.NEVER
			}
		}),
	limit: z.coerce.number().int().positive().optional(),
	page: z.coerce.number().int().positive().optional()
})

function isAdmin(session: SessionLike | undefined): boolean {
	return Boolean(session && session.user.role === 'admin')
}

/**
 * Content CRUD, factored out as a plain Hono app rather than something a
 * consumer hand-writes — `createBaseConfigRoute()` mounts this at the
 * *root* of the API (`.route('/', createContentRoute(contentdb))`), not
 * under a `/content` prefix — so a collection's real REST address is
 * `/api/<slug>` (`/api/pages`, `/api/posts`) and a global's is
 * `/api/globals/<slug>`, matching Payload's own REST shape exactly.
 *
 * **Takes only `db` — nothing else.** Every collection/global is its own
 * real table now (see `content-schema.ts`), but this route never checks a
 * JS-side registry to know which slugs are real: it just calls straight
 * into `content-queries.ts`, and a slug with no matching table surfaces as
 * `UnknownTableError`, caught by the `onError` handler below and turned
 * into a 404. `GET /globals` (list every global) is the one operation that
 * genuinely needs to enumerate *which* slugs exist — `listGlobalSlugs()`
 * answers that by asking the live database directly (which tables have a
 * `data` column but no `status` column), not a registry. No consumer-side
 * file needs to exist, change, or be passed in for any of this to work.
 *
 * `:collection`/`:id` are wildcard path segments living alongside the
 * literal `/globals` routes in the same app — **registered first,
 * deliberately** (see the chain below): Hono's router resolves an
 * ambiguous match (`/globals` could be `/:collection` with `collection:
 * 'globals'`) by registration order, not by static-vs-dynamic priority —
 * confirmed empirically, not assumed. This does mean `globals` is a
 * reserved collection slug — the same constraint Payload itself has around
 * its own reserved top-level paths.
 *
 * **Every route is chained off a single expression, never a bare
 * `app.get(...)` statement.** Hono's RPC type inference (`hc<AppType>()`)
 * only accumulates a route's type information through the *return value*
 * of `.get()`/`.post()`/etc — see `www/src/lib/route.ts`'s own doc comment
 * for why this matters for a consumer's typed RPC client.
 *
 * **Reads are public, writes are admin-only.** Matches how real REST CMS
 * APIs (e.g. Payload's) work: `find`/`findByID` are open by default,
 * mutations aren't. An authenticated admin session sees drafts too (needed
 * to edit them before publishing); anyone else only ever sees
 * `status: 'published'` documents. Globals have no draft/published concept
 * (no `status` column) — `GET` on them is unconditionally public.
 */
export function createContentRoute(db: ContentDatabase) {
	const adminOnly: MiddlewareHandler<ContentRouteEnv> = async (c, next) => {
		if (!isAdmin(c.get('session'))) return c.text('Unauthorized', 401)
		await next()
	}

	const app = new Hono<ContentRouteEnv>()
		.onError((error, c) => {
			if (error instanceof UnknownTableError) {
				return c.json({ error: 'Not found' }, 404)
			}
			console.error(error)
			return c.json({ error: 'Internal Server Error' }, 500)
		})
		.get('/globals', async (c) => {
			const slugs = await listGlobalSlugs(db)
			const rows = await Promise.all(
				slugs.map(async (slug) => {
					const row = await getGlobal(db, slug)
					return {
						slug,
						data: row?.data ?? {},
						updatedAt: row?.updatedAt ?? new Date(0)
					}
				})
			)
			return c.json(rows)
		})
		.get('/globals/:slug', async (c) => {
			const slug = c.req.param('slug')
			const row = await getGlobal(db, slug)
			return c.json(row ? { slug, ...row } : null)
		})
		.patch(
			'/globals/:slug',
			adminOnly,
			zValidator('json', upsertGlobalSchema),
			async (c) => {
				const slug = c.req.param('slug')
				const fields = c.req.valid('json')
				const row = await upsertGlobal(db, slug, fields)
				return c.json({ slug, ...row })
			}
		)
		.get('/:collection', zValidator('query', listQuerySchema), async (c) => {
			const collection = c.req.param('collection')
			const publishedOnly = !isAdmin(c.get('session'))
			const { where, limit, page } = c.req.valid('query')
			const result = await listDocuments(db, collection, {
				publishedOnly,
				where,
				limit,
				page
			})
			return c.json(result)
		})
		.get('/:collection/:id', async (c) => {
			const { collection, id } = c.req.param()
			const publishedOnly = !isAdmin(c.get('session'))
			const row = await getDocument(db, collection, id, { publishedOnly })
			if (!row) return c.json({ error: 'Not found' }, 404)
			return c.json(row)
		})
		.post(
			'/:collection',
			adminOnly,
			zValidator('json', createDocumentSchema),
			async (c) => {
				const collection = c.req.param('collection')
				const body = c.req.valid('json')
				const row = await createDocument(db, collection, body)
				return c.json(row, 201)
			}
		)
		.patch(
			'/:collection/:id',
			adminOnly,
			zValidator('json', updateDocumentSchema),
			async (c) => {
				const { collection, id } = c.req.param()
				const body = c.req.valid('json')
				const row = await updateDocument(db, collection, id, body)
				if (!row) return c.json({ error: 'Not found' }, 404)
				return c.json(row)
			}
		)
		.delete('/:collection/:id', adminOnly, async (c) => {
			const { collection, id } = c.req.param()
			await deleteDocument(db, collection, id)
			return c.json({ ok: true })
		})

	return app
}
