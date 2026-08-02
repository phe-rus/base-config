import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context, MiddlewareHandler } from 'hono'
import { z } from 'zod'
import type { CollectionHooks, HookContext } from '../base.types'
import {
	createDocument,
	deleteDocument,
	getDocument,
	getGlobal,
	listDocuments,
	listGlobalSlugs,
	pruneDocument,
	pruneGlobal,
	UnknownTableError,
	updateDocument,
	upsertGlobal
} from '../db/content-queries'
import type { ContentDatabase } from '../db/content-queries'

type SessionLike = { user: { role?: string | null } }

type ContentRouteEnv = { Variables: { session?: SessionLike } }

export type ContentRouteType = ReturnType<typeof createContentRoute>

/**
 * The exact slice of Cloudflare's real `KVNamespace` this route calls on,
 * structural, same trade-off `R2BucketLike`/`BetterAuthAdminClient` already
 * make so this package never needs `@cloudflare/workers-types` as a
 * dependency for one binding's ambient type. A consumer's real `env.CACHE`
 * satisfies this without a cast.
 */
export type KVNamespaceLike = {
	get: (key: string) => Promise<string | null>
	put: (key: string, value: string) => Promise<void>
	delete: (key: string) => Promise<void>
}

/**
 * A Payload-style custom endpoint (https://payloadcms.com/docs/rest-api/overview):
 * `collection`/`path`/`method` describe where it's mounted (`/api/<collection><path>`,
 * registered *before* the generic `/:collection`/`/:collection/:id` wildcards,
 * same registration-order rule `/globals` already relies on, since e.g.
 * `form-submissions` + `/submit` would otherwise ambiguously match
 * `/:collection/:id` with `id: 'submit'`). `handler` is a plain Hono
 * handler, loosely typed (`Context`, not this file's own internal
 * `ContentRouteEnv`) since a plugin author outside this file can't name
 * that type. Always Tier 2 (never declared inside `defineCollection`'s
 * isomorphic config, same as binding-capable hooks, see
 * `CollectionHooks`' own doc comment): a custom endpoint's whole reason to
 * exist is almost always binding/DB access, so it's registered directly at
 * `createHandler({endpoints: [...]})` instead.
 */
export type ContentEndpoint = {
	collection: string
	path: string
	method: 'get' | 'post' | 'put' | 'patch' | 'delete'
	handler: (c: Context) => Response | Promise<Response>
}

/**
 * What an `EndpointFactory` is handed: always `db`, the one binding every
 * conceivable endpoint factory needs (content persistence). Deliberately
 * just this, no capability-specific bindings (email, payments, anything
 * else one particular plugin might want) live here; a plugin that needs
 * something beyond `db` owns that entirely on its own contract instead
 * (see `EndpointFactory`'s own doc comment for how, e.g.
 * `@baseconfig/plugin-form-builder`'s own `handleEmail`, configured once,
 * directly on `formBuilderPlugin({handleEmail})`, read back by its own
 * `formBuilderEndpoints` via its own options registry, never threaded
 * through here). This keeps `createHandler()`'s own signature stable as
 * more plugins with completely different needs (Stripe keys, a queue
 * binding, whatever) get added later, none of them need a matching new
 * field here.
 */
export type EndpointFactoryBindings = {
	db: ContentDatabase
}

/**
 * **The mechanism that makes "plugins only configured in `base.config.ts`"
 * real**, not just true for isomorphic collections/blocks/hooks. A plugin
 * (e.g. `formBuilderPlugin()`) can't hand `createHandler()` real
 * `ContentEndpoint`s directly: building one needs `db`, a real binding the
 * plugin's own isomorphic `Plugin` function (running inside `baseConfig()`,
 * evaluated in the browser too) can never have. What it *can* safely
 * include in its returned config is this: a plain function reference that
 * *knows how* to build its endpoints once it's later handed `db`, the
 * function itself touches no binding just by existing in the client
 * bundle, only by being *called*, and it's only ever called from
 * `createHandler()` (server-only). Any *other* capability a specific
 * plugin needs (a secret, an email sender, anything) is a plain function
 * reference too, just as safe to merely hold in the plugin's own
 * isomorphic config as `db` is to hold here, since the actual risk is only
 * ever in a function's *body* (does it import/reference something
 * server-only?), never in the mere existence of a function value in the
 * bundle. That's exactly how `@baseconfig/plugin-form-builder`'s own
 * `formBuilderPlugin({handleEmail})` stays fully self-contained: one call
 * configures everything the plugin needs, with no second, separate
 * `createHandler()` param required for it. `baseConfig()` registers every
 * `BaseConfigProps['endpointFactories']` entry (`collections/registry.ts`'s
 * `registerEndpointFactories()`); `createHandler()` calls
 * `collectEndpointFactories()` and invokes each with `{db}`, merging the
 * result with its own Tier-2 `endpoints` param.
 */
export type EndpointFactory = (
	bindings: EndpointFactoryBindings
) => ContentEndpoint[]

export type ContentRouteBindings = {
	db: ContentDatabase
	/**
	 * Optional public-read cache, omit for no caching at all (every read
	 * goes straight to D1). Only ever consulted/populated for genuinely
	 * public reads (`publishedOnly` document reads, and every global read;
	 * globals have no draft/published concept at all); an authenticated
	 * admin request always bypasses it, since admins need to see drafts. A
	 * cache-aside pattern, not "populate on publish": every write
	 * (`PATCH`/`DELETE`) just invalidates the relevant key(s), and the next
	 * public read repopulates it, simpler and harder to get subtly wrong
	 * than trying to compute what a fresh read *would* return at write
	 * time. Covers three shapes: a single document by `id`
	 * (`GET /:collection/:id`), a single document by `slug`
	 * (`GET /:collection?where={"slug":{"equals":"..."}}` with no other
	 * filter/pagination, the one list query a public page-by-slug lookup
	 * actually makes, since a public URL never knows a document's internal
	 * `id`), and a single global (`GET /globals/:slug`, also reused by the
	 * aggregate `GET /globals`). A plain unfiltered/paginated list has no
	 * single natural cache key the way one document does, so it's still
	 * never cached.
	 */
	cache?: KVNamespaceLike
	/**
	 * Tier-1 (isomorphic, pure) hooks, keyed by collection/global slug:
	 * `createHandler()` builds this by merging `collectHooks()`
	 * (`collections/registry.ts`) with its own Tier-2 `hooks` param before
	 * ever reaching here; a consumer calling `createContentRoute()`
	 * directly (bypassing `createHandler()`) can pass its own map too. See
	 * `CollectionHooks`' own doc comment for what a hook may/may not do.
	 */
	hooks?: Record<string, CollectionHooks>
	/** See `ContentEndpoint`'s own doc comment. */
	endpoints?: ContentEndpoint[]
}

function documentCacheKey(collection: string, id: string): string {
	return `content:${collection}:${id}`
}

/**
 * A second cache key for the exact same document, this one reachable by
 * `slug` rather than `id`: a public page is looked up by its URL slug, not
 * its internal id, so the id-keyed cache above is never actually hit by
 * that lookup. Populated/invalidated alongside `documentCacheKey`, never on
 * its own.
 */
function slugCacheKey(collection: string, slug: string): string {
	return `content:${collection}:slug:${slug}`
}

function globalCacheKey(slug: string): string {
	return `content:global:${slug}`
}

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
 * `knownPaths` is computed client-side (`fields/schema.ts`'s
 * `knownFieldPaths`, from the collection/global's own *currently
 * registered* `tabs`/`fields`) and sent as part of the request rather than
 * this route consulting `collectionsBySlug`/`globalsBySlug` itself:
 * deliberately keeps this route registry-free (see its own doc comment, and
 * `listGlobalSlugs`' doc comment in `content-queries.ts` for the real dev-mode
 * SSR race a registry-based check here would reopen), and Prune is already
 * an authenticated, admin-only, deliberately destructive action, the same
 * trust boundary a hand-edited `update` PATCH already crosses. `.min(1)`
 * guards against ever writing an *empty* allowlist (which would prune every
 * field, not just orphaned ones) from a client bug or a genuinely-empty
 * config, either way not something this route should silently allow.
 */
const pruneSchema = z.object({ knownPaths: z.array(z.string()).min(1) })

/**
 * `where` arrives as a JSON-encoded query string (`?where={"status":{"equals":"published"}}`)
 * rather than separate `?status=...`/`?slug=...` params, matches Payload's
 * own REST convention (`?where[status][equals]=published`, here flattened
 * to one param since Hono has no built-in bracket-notation query parser)
 * and keeps this route's query shape extensible without new params per
 * filterable column. Only `status`/`slug` are accepted, see
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
 * consumer hand-writes: `createBaseConfigRoute()` mounts this at the
 * *root* of the API (`.route('/', createContentRoute({db, cache}))`), not
 * under a `/content` prefix, so a collection's real REST address is
 * `/api/<slug>` (`/api/pages`, `/api/posts`) and a global's is
 * `/api/globals/<slug>`, matching Payload's own REST shape exactly.
 *
 * **Takes only `db`, nothing else.** Every collection/global is its own
 * real table now (see `content-schema.ts`), but this route never checks a
 * JS-side registry to know which slugs are real: it just calls straight
 * into `content-queries.ts`, and a slug with no matching table surfaces as
 * `UnknownTableError`, caught by the `onError` handler below and turned
 * into a 404. `GET /globals` (list every global) is the one operation that
 * genuinely needs to enumerate *which* slugs exist: `listGlobalSlugs()`
 * answers that by asking the live database directly (which tables have a
 * `data` column but no `status` column), not a registry. No consumer-side
 * file needs to exist, change, or be passed in for any of this to work.
 *
 * `:collection`/`:id` are wildcard path segments living alongside the
 * literal `/globals` routes in the same app, **registered first,
 * deliberately** (see the chain below): Hono's router resolves an
 * ambiguous match (`/globals` could be `/:collection` with `collection:
 * 'globals'`) by registration order, not by static-vs-dynamic priority,
 * confirmed empirically, not assumed. This does mean `globals` is a
 * reserved collection slug, the same constraint Payload itself has around
 * its own reserved top-level paths.
 *
 * **Every route is chained off a single expression, never a bare
 * `app.get(...)` statement.** Hono's RPC type inference (`hc<AppType>()`)
 * only accumulates a route's type information through the *return value*
 * of `.get()`/`.post()`/etc, see `www/src/lib/route.ts`'s own doc comment
 * for why this matters for a consumer's typed RPC client.
 *
 * **Reads are public, writes are admin-only.** Matches how real REST CMS
 * APIs (e.g. Payload's) work: `find`/`findByID` are open by default,
 * mutations aren't. An authenticated admin session sees drafts too (needed
 * to edit them before publishing); anyone else only ever sees
 * `status: 'published'` documents. Globals have no draft/published concept
 * (no `status` column): `GET` on them is unconditionally public.
 *
 * **`cache` (optional) fronts single-document/single-global public reads,
 * by `id` or by `slug`, plus the aggregate globals list**, see
 * `ContentRouteBindings['cache']`'s own doc comment for the three shapes it
 * covers. A plain filtered/paginated document list is still never cached,
 * no single natural cache key the way one document does.
 *
 * **`hooks`/`endpoints` (both optional)**, see `CollectionHooks`'/
 * `ContentEndpoint`'s own doc comments. `endpoints` are mounted first,
 * ahead of every built-in route, via a `reduce()` (a plugin's endpoint list
 * is only known at runtime, so it can't be part of the single static
 * chained expression the built-in routes are, meaning custom endpoints
 * aren't part of `ContentRouteType`'s own RPC-inferred shape, which is
 * fine: nothing in this package's own admin UI calls a plugin's endpoint
 * through the typed client, only a public page's plain `fetch()` does).
 */
export function createContentRoute({
	db,
	cache,
	hooks,
	endpoints
}: ContentRouteBindings) {
	const adminOnly: MiddlewareHandler<ContentRouteEnv> = async (c, next) => {
		if (!isAdmin(c.get('session'))) return c.text('Unauthorized', 401)
		await next()
	}

	/**
	 * Shared by both globals routes below (`GET /globals` and
	 * `GET /globals/:slug`) so the aggregate list route benefits from the
	 * same cache-aside behavior the single-global route already had:
	 * before this, `GET /globals` called `getGlobal` directly, bypassing
	 * `cache` entirely even though every individual slug was otherwise
	 * cached.
	 */
	async function getCachedGlobal(slug: string) {
		if (cache) {
			const cached = await cache.get(globalCacheKey(slug))
			if (cached) return JSON.parse(cached)
		}
		const row = await getGlobal(db, slug)
		const result = row ? { slug, ...row } : null
		if (cache && result) {
			await cache.put(globalCacheKey(slug), JSON.stringify(result))
		}
		return result
	}

	const withEndpoints = (endpoints ?? []).reduce(
		(current, endpoint) =>
			current.on(
				endpoint.method.toUpperCase(),
				`/${endpoint.collection}${endpoint.path}`,
				endpoint.handler
			),
		new Hono<ContentRouteEnv>().onError((error, c) => {
			if (error instanceof UnknownTableError) {
				return c.json({ error: 'Not found' }, 404)
			}
			console.error(error)
			return c.json({ error: 'Internal Server Error' }, 500)
		})
	)

	const app = withEndpoints
		.get('/globals', async (c) => {
			const slugs = await listGlobalSlugs(db)
			const rows = await Promise.all(
				slugs.map(async (slug) => {
					const cached = await getCachedGlobal(slug)
					return {
						slug,
						data: cached?.data ?? {},
						updatedAt: cached?.updatedAt ?? new Date(0)
					}
				})
			)
			return c.json(rows)
		})
		.get('/globals/:slug', async (c) => {
			const slug = c.req.param('slug')
			return c.json(await getCachedGlobal(slug))
		})
		.patch(
			'/globals/:slug',
			adminOnly,
			zValidator('json', upsertGlobalSchema),
			async (c) => {
				const slug = c.req.param('slug')
				const globalHooks = hooks?.[slug]
				const ctx: HookContext = { slug, operation: 'update' }
				let fields = c.req.valid('json')
				if (globalHooks?.beforeChange) {
					fields = await globalHooks.beforeChange(fields, ctx)
				}
				const row = await upsertGlobal(db, slug, fields)
				if (cache) await cache.delete(globalCacheKey(slug))
				const result = { slug, ...row }
				if (globalHooks?.afterChange) await globalHooks.afterChange(result, ctx)
				return c.json(result)
			}
		)
		.post(
			'/globals/:slug/prune',
			adminOnly,
			zValidator('json', pruneSchema),
			async (c) => {
				const slug = c.req.param('slug')
				const { knownPaths } = c.req.valid('json')
				const row = await pruneGlobal(db, slug, knownPaths)
				if (!row) return c.json({ error: 'Not found' }, 404)
				if (cache) await cache.delete(globalCacheKey(slug))
				return c.json({ slug, ...row })
			}
		)
		.get('/:collection', zValidator('query', listQuerySchema), async (c) => {
			const collection = c.req.param('collection')
			const publishedOnly = !isAdmin(c.get('session'))
			const { where, limit, page } = c.req.valid('query')

			// The one list shape a public page-by-slug lookup actually makes
			// (`?where={"slug":{"equals":"..."}}`, no other filter/pagination):
			// a public URL resolves to a document by slug, never by id, so
			// this is the query that actually needs caching for a page to load
			// fast; a plain unfiltered/paginated list has no single cache key
			// the way one slug lookup does, so it stays uncached.
			const slug = where?.slug?.equals
			const cacheableSlugLookup =
				cache && publishedOnly && slug && !where?.status && !limit && !page

			if (cacheableSlugLookup) {
				const cached = await cache.get(slugCacheKey(collection, slug))
				if (cached) return c.json(JSON.parse(cached))
			}

			const result = await listDocuments(db, collection, {
				publishedOnly,
				where,
				limit,
				page
			})

			// Same convention `/:collection/:id` already follows: only a real
			// hit gets cached, never a "not found" result, otherwise a
			// document created later under a previously-missed slug would
			// stay invisible until something else happened to invalidate it.
			if (cacheableSlugLookup && result.docs.length > 0) {
				await cache.put(slugCacheKey(collection, slug), JSON.stringify(result))
			}

			return c.json(result)
		})
		.get('/:collection/:id', async (c) => {
			const { collection, id } = c.req.param()
			const publishedOnly = !isAdmin(c.get('session'))
			// Only the genuinely public path ever touches the cache: an admin
			// request needs to see drafts, which this cache never stores.
			if (cache && publishedOnly) {
				const cached = await cache.get(documentCacheKey(collection, id))
				if (cached) return c.json(JSON.parse(cached))
			}
			const row = await getDocument(db, collection, id, { publishedOnly })
			if (!row) return c.json({ error: 'Not found' }, 404)
			if (cache && publishedOnly) {
				await cache.put(documentCacheKey(collection, id), JSON.stringify(row))
			}
			return c.json(row)
		})
		.post(
			'/:collection',
			adminOnly,
			zValidator('json', createDocumentSchema),
			async (c) => {
				const collection = c.req.param('collection')
				const collectionHooks = hooks?.[collection]
				const ctx: HookContext = { slug: collection, operation: 'create' }
				const body = c.req.valid('json')
				const data = collectionHooks?.beforeChange
					? await collectionHooks.beforeChange(body.data, ctx)
					: body.data
				const row = await createDocument(db, collection, { ...body, data })
				if (collectionHooks?.afterChange) {
					await collectionHooks.afterChange(row, ctx)
				}
				return c.json(row, 201)
			}
		)
		.patch(
			'/:collection/:id',
			adminOnly,
			zValidator('json', updateDocumentSchema),
			async (c) => {
				const { collection, id } = c.req.param()
				const collectionHooks = hooks?.[collection]
				const ctx: HookContext = { slug: collection, operation: 'update' }
				const body = c.req.valid('json')
				const fields =
					collectionHooks?.beforeChange && body.fields
						? await collectionHooks.beforeChange(body.fields, ctx)
						: body.fields

				// Read the slug this document had *before* the write, in case
				// this update renames it: a slug change needs its old cache
				// entry invalidated too, not just whatever slug the row has
				// after the write.
				const existing = cache
					? await getDocument(db, collection, id)
					: undefined

				const row = await updateDocument(db, collection, id, {
					...body,
					fields
				})
				if (!row) return c.json({ error: 'Not found' }, 404)
				// Invalidate rather than recompute-and-repopulate here: covers
				// publish, unpublish, and a plain draft edit alike (the next
				// public read repopulates correctly either way, including
				// caching nothing at all if the doc isn't publicly visible).
				if (cache) {
					await cache.delete(documentCacheKey(collection, id))
					if (existing?.slug) {
						await cache.delete(slugCacheKey(collection, existing.slug))
					}
					if (row.slug && row.slug !== existing?.slug) {
						await cache.delete(slugCacheKey(collection, row.slug))
					}
				}
				if (collectionHooks?.afterChange) {
					await collectionHooks.afterChange(row, ctx)
				}
				return c.json(row)
			}
		)
		.post(
			'/:collection/:id/prune',
			adminOnly,
			zValidator('json', pruneSchema),
			async (c) => {
				const { collection, id } = c.req.param()
				const { knownPaths } = c.req.valid('json')

				const existing = cache
					? await getDocument(db, collection, id)
					: undefined

				const row = await pruneDocument(db, collection, id, knownPaths)
				if (!row) return c.json({ error: 'Not found' }, 404)

				if (cache) {
					await cache.delete(documentCacheKey(collection, id))
					if (existing?.slug) {
						await cache.delete(slugCacheKey(collection, existing.slug))
					}
				}
				return c.json(row)
			}
		)
		.delete('/:collection/:id', adminOnly, async (c) => {
			const { collection, id } = c.req.param()
			// Same reasoning as the PATCH handler above: read the slug before
			// deleting, since there's nothing left to read it from afterward.
			const existing = cache ? await getDocument(db, collection, id) : undefined
			await deleteDocument(db, collection, id)
			if (cache) {
				await cache.delete(documentCacheKey(collection, id))
				if (existing?.slug) {
					await cache.delete(slugCacheKey(collection, existing.slug))
				}
			}
			return c.json({ ok: true })
		})

	return app
}
