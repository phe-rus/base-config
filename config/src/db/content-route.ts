import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
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
 * Content CRUD, factored out as a plain Hono app rather than something a
 * consumer hand-writes — `www/src/api/api.ts` just does
 * `.route('/content', createContentRoute(contentdb))`. Same "the library
 * builds the routes, the consumer only mounts them" shape decided for a
 * plugin's own API-route surface (see the project's own docs). Takes the
 * consumer's `drizzle(env.BASECONFIG, ...)` instance directly rather than
 * reading `env` itself — this package never resolves bindings on its own
 * (same reasoning as `ignite()` never reading `env`). `session` is read
 * structurally off the Hono context (set by the consumer's own auth
 * middleware upstream, e.g. `authMiddleware` in `www/src/api/index.ts`)
 * rather than through any particular auth library's types — same
 * auth-agnostic trade-off `guard.ts`/`Topbar` already make.
 */
export function createContentRoute(db: ContentDatabase) {
	const app = new Hono<ContentRouteEnv>()
	app.use('*', async (c, next) => {
		const session = c.get('session')
		if (!session || session.user.role !== 'admin') {
			return c.text('Unauthorized', 401)
		}
		await next()
	})
	app.get('/documents/:collection', async (c) => {
		const rows = await listDocuments(db, c.req.param('collection'))
		return c.json(rows)
	})
	app.get('/documents/:collection/:id', async (c) => {
		const { collection, id } = c.req.param()
		const row = await getDocument(db, collection, id)
		if (!row) return c.json({ error: 'Not found' }, 404)
		return c.json(row)
	})
	app.post(
		'/documents/:collection',
		zValidator('json', createDocumentSchema),
		async (c) => {
			const collection = c.req.param('collection')
			const body = c.req.valid('json')
			const row = await createDocument(db, { ...body, collection })
			return c.json(row, 201)
		}
	)
	app.patch(
		'/documents/:collection/:id',
		zValidator('json', updateDocumentSchema),
		async (c) => {
			const { collection, id } = c.req.param()
			const body = c.req.valid('json')
			const row = await updateDocument(db, collection, id, body)
			if (!row) return c.json({ error: 'Not found' }, 404)
			return c.json(row)
		}
	)
	app.delete('/documents/:collection/:id', async (c) => {
		const { collection, id } = c.req.param()
		await deleteDocument(db, collection, id)
		return c.json({ ok: true })
	})
	app.get('/globals', async (c) => {
		const rows = await listGlobals(db)
		return c.json(rows)
	})
	app.get('/globals/:slug', async (c) => {
		const row = await getGlobal(db, c.req.param('slug'))
		return c.json(row ?? null)
	})
	app.patch(
		'/globals/:slug',
		zValidator('json', upsertGlobalSchema),
		async (c) => {
			const fields = c.req.valid('json')
			const row = await upsertGlobal(db, c.req.param('slug'), fields)
			return c.json(row)
		}
	)
	return app
}
