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
	listGlobals,
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
 * `/api/globals/<slug>`, matching Payload's own REST shape exactly rather
 * than a `/api/content/documents/<slug>` nesting that has no Payload
 * equivalent. `:collection`/`:id` are wildcard path segments living
 * alongside the literal `/globals` routes in the same app — **registered
 * first, deliberately** (see the chain below): Hono's router resolves an
 * ambiguous match (`/globals` could be `/:collection` with `collection:
 * 'globals'`) by registration order, not by static-vs-dynamic priority —
 * confirmed empirically, not assumed. This does mean `globals`/`storage`
 * are reserved — a real collection can never be slugged one of those two,
 * the same constraint Payload itself has around its own reserved
 * top-level paths. Takes the consumer's `drizzle(env.BASECONFIG, ...)`
 * instance directly rather than reading `env` itself.
 *
 * **Every route is chained off a single expression, never a bare
 * `app.get(...)` statement.** Hono's RPC type inference (`hc<AppType>()`)
 * only accumulates a route's type information through the *return value*
 * of `.get()`/`.post()`/etc — each call returns a new, more-specific app
 * type with that route folded in. Calling `app.post(...)` as its own
 * statement (discarding the return value, `app`'s own type never updated)
 * silently produces a real, working *server* — but the exported type is
 * missing that route entirely, so a consumer's `hc<TypeRouter>()` client
 * can never see it. This was a real bug in an earlier version of this
 * file (every route as a separate `app.get(...)` statement) — this whole
 * app is now one chained expression specifically so `www`'s own typed RPC
 * client (`ContentApiClient`'s real implementation, see
 * `www/src/config/base.config.ts`) actually gets full route/method
 * inference, not just a plain untyped `Hono` instance.
 *
 * **Reads are public, writes are admin-only** — this was a second real bug
 * in an earlier version: every method, including `GET`, sat behind one
 * blanket admin-only gate, which meant a public site built on this CMS
 * could never read its own published content without an admin session.
 * Matches how real REST CMS APIs (e.g. Payload's) work: `find`/`findByID`
 * are open by default, mutations aren't. An authenticated admin session
 * sees drafts too (needed to edit them before publishing); anyone else
 * only ever sees `status: 'published'` documents (`getDocument`/
 * `listDocuments`'s own `publishedOnly` option, `content-queries.ts`).
 * Globals have no draft/published concept (no `status` column) — `GET` on
 * them is unconditionally public.
 */
export function createContentRoute(db: ContentDatabase) {
	const adminOnly: MiddlewareHandler<ContentRouteEnv> = async (c, next) => {
		if (!isAdmin(c.get('session'))) return c.text('Unauthorized', 401)
		await next()
	}

	// `/globals*` is registered *before* `/:collection`/`/:collection/:id` —
	// deliberately. Hono's router doesn't reliably prioritize a literal
	// segment over a same-depth dynamic one across routes composed from
	// separate `.get()`/`.post()` calls the way its own docs suggest; a
	// `/globals` request was empirically swallowed by `/:collection`
	// (`collection: 'globals'`) when the wildcard routes were registered
	// first. Registration order is what actually decides ambiguous matches
	// here, so the specific routes have to come first, full stop — this
	// isn't cosmetic. `/storage` doesn't need the same fix since it's
	// mounted as an entirely separate sub-app *before* this one in
	// `createBaseConfigRoute()` (see that file's own doc comment).
	const app = new Hono<ContentRouteEnv>()
		.get('/globals', async (c) => {
			const rows = await listGlobals(db)
			return c.json(rows)
		})
		.get('/globals/:slug', async (c) => {
			const row = await getGlobal(db, c.req.param('slug'))
			return c.json(row ?? null)
		})
		.patch(
			'/globals/:slug',
			adminOnly,
			zValidator('json', upsertGlobalSchema),
			async (c) => {
				const fields = c.req.valid('json')
				const row = await upsertGlobal(db, c.req.param('slug'), fields)
				return c.json(row)
			}
		)
		.get('/:collection', zValidator('query', listQuerySchema), async (c) => {
			const publishedOnly = !isAdmin(c.get('session'))
			const { where, limit, page } = c.req.valid('query')
			const result = await listDocuments(db, c.req.param('collection'), {
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
				const row = await createDocument(db, { ...body, collection })
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
