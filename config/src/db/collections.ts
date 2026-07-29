import { collectionsBySlug } from '../collections/registry'
import type { CollectionSlug } from '../collections/types'
import {
	createCollection,
	localStorageCollectionOptions,
	useLiveQuery
} from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import type {
	CreateDocumentInput,
	DocumentRow as ServerDocumentRow,
	GlobalRow as ServerGlobalRow,
	UpdateDocumentInput,
	WhereCondition
} from './content-queries'

export const statusValues = ['draft', 'published', 'unpublished'] as const
export type DocumentStatus = (typeof statusValues)[number]

export type DocumentRow<TData> = {
	id: string
	data: TData
	status: DocumentStatus
	createdAt: string
	updatedAt: string
}

/**
 * The wire shape `GET/POST/PATCH /api/<collection>` actually returns —
 * derived from the server's own `DocumentRow` (`content-queries.ts`)
 * rather than hand-redeclared field-by-field, so the two can't silently
 * drift. Only real difference: `createdAt`/`updatedAt` are `Date` objects
 * server-side (Drizzle's `timestamp_ms` mode) but cross the wire as ISO
 * strings — JSON has no `Date` type, and Hono's `c.json()` serializes one
 * to the other automatically.
 */
export type ContentDocumentRow = Omit<
	ServerDocumentRow,
	'createdAt' | 'updatedAt'
> & {
	createdAt: string
	updatedAt: string
}

/**
 * A global's own table has no `slug` column at all (it's identified by
 * *which table* it is, not a row field — see `content-schema.ts`) —
 * `content-route.ts` injects `slug` itself when serializing a response, so
 * this type adds it back rather than deriving it from the server's own
 * `GlobalRow`, which correctly doesn't have it.
 */
export type ContentGlobalRow = Omit<ServerGlobalRow, 'updatedAt'> & {
	slug: string
	updatedAt: string
}

/** Identical to the server's own `CreateDocumentInput`. */
export type CreateDocumentBody = CreateDocumentInput

/** The server's own `UpdateDocumentInput` — no client-side differences at all; re-exported under this name for symmetry with `CreateDocumentBody` and discoverability from this file. */
export type UpdateDocumentBody = UpdateDocumentInput

/** What every `content-route.ts` response resolves to, whether it came back through `fetch`'s own `Response` or Hono's own `ClientResponse` wrapper — both satisfy this shape. */
type JsonClientResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** What `content-route.ts`'s `listDocuments`/`find` route now returns — see `content-queries.ts`'s own `PaginatedResult`. Re-declared here (not imported) because it's parameterized over `ContentDocumentRow`, the wire type, not the server's own `DocumentRow`. */
export type ContentPaginatedResult<T> = {
	docs: T[]
	totalDocs: number
	limit: number
	page: number
	totalPages: number
	hasNextPage: boolean
	hasPrevPage: boolean
}

export type FindOptions = {
	collection: string
	/** Top-level column filters only (`status`/`slug`) — see `WhereCondition`'s own doc comment in `content-queries.ts` for why arbitrary-field querying isn't supported. */
	where?: WhereCondition
	limit?: number
	page?: number
}
export type FindByIdOptions = { collection: string; id: string }
export type CreateOptions = { collection: string; data: CreateDocumentBody }
export type UpdateOptions = {
	collection: string
	id: string
	data: UpdateDocumentBody
}
export type DeleteOptions = { collection: string; id: string }
export type FindGlobalOptions = { slug: string }
export type UpdateGlobalOptions = {
	slug: string
	data: Record<string, unknown>
}

/**
 * The exact shape `hc<TypeRouter>()`'s own client produces for
 * `content-route.ts`'s routes, once a consumer has mounted it (e.g.
 * `route.api`) — structural, not `typeof route.api` itself, since this
 * package can't import a consumer's app-specific `TypeRouter`.
 * `createContentApiClient()` below is what actually consumes this — a
 * consumer only ever needs to pass their own mounted RPC sub-client in,
 * not hand-write the wrapper functions themselves. Flat, not nested under
 * `documents`/`content` — `content-route.ts` is mounted at the API's own
 * root now (`/api/<collection>`, matching Payload's real REST shape, see
 * that file's own doc comment), so Hono's generated client mirrors that:
 * `route.api[':collection']`, not `route.api.content.documents[':collection']`.
 */
export type ContentRpcClient = Record<
	':collection',
	{
		$get: (args: {
			param: { collection: string }
			query: {
				where?: string
				limit?: string | string[]
				page?: string | string[]
			}
		}) => Promise<JsonClientResponse>
		$post: (args: {
			param: { collection: string }
			json: CreateDocumentBody
		}) => Promise<JsonClientResponse>
	} & Record<
		':id',
		{
			$get: (args: {
				param: { collection: string; id: string }
			}) => Promise<JsonClientResponse>
			$patch: (args: {
				param: { collection: string; id: string }
				json: UpdateDocumentBody
			}) => Promise<JsonClientResponse>
			$delete: (args: {
				param: { collection: string; id: string }
			}) => Promise<JsonClientResponse>
		}
	>
> & {
	globals: {
		$get: () => Promise<JsonClientResponse>
	} & Record<
		':slug',
		{
			$get: (args: { param: { slug: string } }) => Promise<JsonClientResponse>
			$patch: (args: {
				param: { slug: string }
				json: Record<string, unknown>
			}) => Promise<JsonClientResponse>
		}
	>
}

/**
 * The exact slice of `/api/<collection>`/`/api/globals/*` this package calls — a plain,
 * already-resolved async-function interface, not tied to Hono's own
 * `hc<TypeRouter>()` client type directly (that's what `ContentRpcClient`
 * is for). Named after Payload's own Local API (`payload.find`/
 * `findByID`/`create`/`update`/`delete`/`findGlobal`/`updateGlobal`)
 * deliberately — same operations, same names, backed by Hono RPC instead
 * of a direct DB connection. A consumer builds a real implementation via
 * `createContentApiClient(route.api)` (below) — one line, not a
 * hand-written file re-implementing this package's own wrapper functions.
 * `base` (see `content-client.ts`) is the ready-to-import singleton built
 * on top of this — most application code should reach for that, not this
 * directly; this is the injection seam `registerContentDataSource` needs.
 */
export type ContentApiClient = {
	find: (
		options: FindOptions
	) => Promise<ContentPaginatedResult<ContentDocumentRow>>
	findByID: (options: FindByIdOptions) => Promise<ContentDocumentRow>
	create: (options: CreateOptions) => Promise<ContentDocumentRow>
	update: (options: UpdateOptions) => Promise<ContentDocumentRow>
	delete: (options: DeleteOptions) => Promise<void>
	listGlobals: () => Promise<ContentGlobalRow[]>
	findGlobal: (options: FindGlobalOptions) => Promise<ContentGlobalRow | null>
	updateGlobal: (options: UpdateGlobalOptions) => Promise<ContentGlobalRow>
}

/**
 * Every route this client calls can also fail `zValidator`'s own
 * validation (a real, distinct response shape Hono's RPC typing correctly
 * includes in the union) — `res.ok` is what actually distinguishes that
 * from a real success response; the cast to `T` only happens once that's
 * been checked, not assumed away.
 */
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
 * Builds a real `ContentApiClient` from a consumer's own mounted Hono RPC
 * sub-client (e.g. `route.api`, where `route = hc<TypeRouter>(...)`)
 * — this is the whole point of `ContentRpcClient` existing: a consumer
 * passes in one already-typed object, this package does the actual
 * wiring, matching Payload's own "the library provides the operations,
 * the consumer just calls them" Local API shape rather than making every
 * consumer re-implement these wrapper functions by hand. Never uses
 * `fetch` directly — every call goes through the injected RPC client, so
 * it inherits Hono's real request/response typing end to end.
 */
export function createContentApiClient(
	client: ContentRpcClient
): ContentApiClient {
	return {
		find: async ({ collection, where, limit, page }) => {
			const res = await client[':collection'].$get({
				param: { collection },
				query: {
					where: where ? JSON.stringify(where) : undefined,
					limit: limit !== undefined ? String(limit) : undefined,
					page: page !== undefined ? String(page) : undefined
				}
			})
			return unwrapJson(res)
		},
		findByID: async ({ collection, id }) => {
			const res = await client[':collection'][':id'].$get({
				param: { collection, id }
			})
			return unwrapJson(res)
		},
		create: async ({ collection, data }) => {
			const res = await client[':collection'].$post({
				param: { collection },
				json: data
			})
			return unwrapJson(res)
		},
		update: async ({ collection, id, data }) => {
			const res = await client[':collection'][':id'].$patch({
				param: { collection, id },
				json: data
			})
			return unwrapJson(res)
		},
		delete: async ({ collection, id }) => {
			await client[':collection'][':id'].$delete({
				param: { collection, id }
			})
		},
		listGlobals: async () => {
			const res = await client.globals.$get()
			return unwrapJson(res)
		},
		findGlobal: async ({ slug }) => {
			const res = await client.globals[':slug'].$get({ param: { slug } })
			return unwrapJson(res)
		},
		updateGlobal: async ({ slug, data }) => {
			const res = await client.globals[':slug'].$patch({
				param: { slug },
				json: data
			})
			return unwrapJson(res)
		}
	}
}

const baseFieldsSchema = z.object({ title: z.string(), slug: z.string() })
export function withBaseFields<TSchema extends z.ZodTypeAny>(
	dataSchema: TSchema
) {
	return baseFieldsSchema.and(dataSchema)
}

export type ContentCollection = ReturnType<typeof createContentCollection>

type ContentDataSource = {
	queryClient: QueryClient
	client: ContentApiClient
}
let contentDataSource: ContentDataSource | undefined

/** Call once, client-side — `baseConfig()` does this unconditionally (unlike `registerUsersDataSource`, every consumer needs content persistence, not just ones with an `auth: true` collection). */
export function registerContentDataSource(source: ContentDataSource) {
	contentDataSource = source
}

/** Exported for `content-client.ts`'s `base` singleton — everything else in this file keeps calling the un-exported form below directly. */
export function requireContentDataSource(): ContentDataSource {
	if (!contentDataSource) {
		throw new Error(
			'A content collection was rendered before registerContentDataSource() was called — see db/collections.ts.'
		)
	}
	return contentDataSource
}

/** `title`/`slug` live inside a regular collection's own `data` (per `withBaseFields`) on the client, but as real top-level D1 columns on the wire — every fetch/write crosses that seam once, here. */
function splitDocumentFields(data: Record<string, unknown>) {
	const { title, slug, ...rest } = data
	return {
		title: typeof title === 'string' ? title : undefined,
		slug: typeof slug === 'string' ? slug : undefined,
		rest
	}
}

function toDocumentRow(
	row: ContentDocumentRow
): DocumentRow<Record<string, unknown>> {
	return {
		id: row.id,
		data: { ...row.data, title: row.title ?? '', slug: row.slug ?? '' },
		status: row.status,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	}
}

/**
 * The real, `/api/<collection>`-backed side of a collection — what
 * `publish()` (`db/use-document.ts`) writes to, never what an admin edits
 * directly (that's `draftCollections` below, `localStorage`-backed). Loads
 * once (`staleTime: Infinity`, no refetch on window focus/reconnect); after
 * a mutation resolves, the mutation's own response (already the
 * authoritative row) is written straight into this collection's cache via
 * `collection.utils.writeInsert`/`writeUpdate`/`writeDelete` — no follow-up
 * `refetch()` GET, which is exactly what produced the "too many requests"
 * bug this replaced (a full list re-fetch after every single write). `onUpdate`
 * diffs `original`/`modified` so a write only ever sends the fields that
 * actually changed (see `content-queries.ts`'s `updateDocument`, which
 * merges rather than replaces `data`).
 */
function createContentCollection(slug: string) {
	const { queryClient, client } = requireContentDataSource()

	return createCollection(
		queryCollectionOptions<DocumentRow<Record<string, unknown>>>({
			queryKey: ['content', 'documents', slug],
			queryClient,
			getKey: (item) => item.id,
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			queryFn: async () => {
				const { docs } = await client.find({ collection: slug })
				return docs.map(toDocumentRow)
			},
			onInsert: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						const {
							title,
							slug: docSlug,
							rest
						} = splitDocumentFields(
							mutation.modified.data as Record<string, unknown>
						)
						const created = await client.create({
							collection: slug,
							data: {
								id: mutation.modified.id,
								title,
								slug: docSlug,
								status: mutation.modified.status as 'draft' | 'published',
								data: rest
							}
						})
						collection.utils.writeInsert(toDocumentRow(created))
					})
				)
			},
			onUpdate: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						const original = splitDocumentFields(
							mutation.original.data as Record<string, unknown>
						)
						const modified = splitDocumentFields(
							mutation.modified.data as Record<string, unknown>
						)
						const fields: Record<string, unknown> = {}
						for (const key of Object.keys(modified.rest)) {
							if (!Object.is(modified.rest[key], original.rest[key])) {
								fields[key] = modified.rest[key]
							}
						}
						const body: UpdateDocumentBody = {}
						if (modified.title !== original.title) body.title = modified.title
						if (modified.slug !== original.slug) body.slug = modified.slug
						if (mutation.modified.status !== mutation.original.status) {
							body.status = mutation.modified.status as 'draft' | 'published'
						}
						if (Object.keys(fields).length > 0) body.fields = fields
						if (Object.keys(body).length === 0) return
						const updated = await client.update({
							collection: slug,
							id: mutation.key as string,
							data: body
						})
						collection.utils.writeUpdate(toDocumentRow(updated))
					})
				)
			},
			onDelete: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						await client.delete({
							collection: slug,
							id: mutation.key as string
						})
					})
				)
				collection.utils.writeDelete(
					transaction.mutations.map((mutation) => mutation.key as string)
				)
			}
		})
	)
}

// --- `auth: true` collections (see `CollectionConfig['auth']`) are real,
// server-backed accounts — not `localStorage` like every other collection.
// Deliberately coupled to better-auth specifically (not "any auth library"):
// the consumer passes its own `authClient` (better-auth's React client, with
// the `adminClient()` plugin registered) straight through `baseConfig()`,
// and this package calls `authClient.admin.*` by name itself. This is a
// conscious exception to the auth-agnostic stance every other piece of this
// package takes (`Topbar`'s `sessions` prop, `guard.ts`'s session typing) —
// made because hand-wiring four server functions per consumer for exactly
// one library-supported auth backend wasn't worth the abstraction. ---

/**
 * The one real user row shape better-auth's admin plugin returns. Kept
 * closed to just the fields this package actually destructures/reads
 * (no index signature — that breaks assignability from better-auth's own,
 * equally closed `UserWithRole` type). A consumer's `auth.ts` can still add
 * its own `user.additionalFields` (e.g. `age`): `toUserDocumentRow()` below
 * spreads the *real* object's remaining properties through at runtime via
 * `...rest`, which works regardless of what this type does or doesn't know
 * about ahead of time — TS just won't statically know `age` is there.
 */
export type RealUserRow = {
	id: string
	name: string
	email: string
	role?: string | string[] | null
	banned?: boolean | null
	username?: string | null
	/** Set by better-auth's own `twoFactor()` plugin — real, per-user, DB-backed. Not destructured out in `toUserDocumentRow()` below, so it flows through into a document's own `data` via `...rest` like any other field the admin's `users` collection wants to show (see `www/src/config/collections/users.ts`). */
	twoFactorEnabled?: boolean | null
	createdAt: string | Date
	updatedAt: string | Date
}

/** One `{data, error}`-shaped better-auth client response — every real client action returns this instead of rejecting (see `unwrap()` below). */
type AuthClientResult<T> = Promise<{ data: T | null; error: unknown }>

/**
 * The exact slice of `authClient.*`/`authClient.admin.*` this package calls
 * — structural on purpose, so any `authClient` with the matching plugins
 * registered satisfies it without this package importing `better-auth`'s
 * own types. `passkey`/`twoFactor` are deliberately optional — their
 * presence is a safe, real runtime feature-detection (`createAuthClient({plugins})`
 * only puts these keys on the client object when the corresponding client
 * plugin was actually included), used by the admin auth screens
 * (`login-view.tsx`/`create-account-view.tsx`) to conditionally render
 * passkey/2FA UI rather than assuming every consumer has them configured.
 */
export type BetterAuthAdminClient = {
	/** Core client method (not part of `adminClient()`) — used by `Topbar`'s sign-out button. */
	signOut: () => Promise<{ data: unknown; error: unknown }>
	/**
	 * better-auth's own real reactive hook (`createAuthClient()`'s built-in
	 * `useSession`, confirmed against its own `.d.ts` — `{data, isPending,
	 * isRefetching, error, refetch}`, trimmed here to the two fields
	 * anything in this package actually reads) — a real, live client-side
	 * session read with no query/cache machinery of its own to get wrong,
	 * used so `Topbar`/a consumer's own header don't need a `session` prop
	 * threaded down just to show who's signed in (see `Topbar`'s own doc
	 * comment).
	 */
	useSession: () => {
		data: {
			user: { name?: string | null; role?: string | string[] | null }
		} | null
		isPending: boolean
	}
	/**
	 * The promise-based sibling of `useSession` above — better-auth's own
	 * client method (not `fetch`), used by `useAdminSession()`
	 * (`admin/functions/session-query.ts`) specifically so multiple admin
	 * surfaces (`Topbar`, `ProviderView.Context`, `Dashboard`) can share ONE
	 * TanStack Query cache entry instead of each independently subscribing
	 * to the reactive `useSession()` store — confirmed this mattered in
	 * practice: three separate `useSession()` calls produced real duplicate
	 * `/api/auth/get-session` requests.
	 */
	getSession: () => AuthClientResult<{
		user: { role?: string | string[] | null }
	}>
	/** Core client methods (email+password and username+password are "the same thing, different terminology" — a `LoginView` merges both into one `credentials` field and picks which of these to call based on whether it looks like an email, same design the app already had). `social` is optional — only called when a consumer's own `socialProviders` list names a provider. */
	signIn: {
		email: (opts: {
			email: string
			password: string
			rememberMe?: boolean
		}) => AuthClientResult<{ user: RealUserRow; token?: string | null }>
		username: (opts: {
			username: string
			password: string
			rememberMe?: boolean
		}) => AuthClientResult<{ user: RealUserRow; token?: string | null }>
		social?: (opts: { provider: string }) => AuthClientResult<unknown>
		/** From `@better-auth/passkey`'s own client plugin — sign in with an already-registered passkey, no password at all. */
		passkey?: (opts?: {
			autoFill?: boolean
		}) => AuthClientResult<{ user: RealUserRow }>
	}
	signUp: {
		email: (opts: {
			email: string
			password: string
			name: string
			username?: string
			displayUsername?: string
		}) => AuthClientResult<{ user: RealUserRow }>
	}
	/** From `username()`'s own client plugin — the debounced availability check `CreateAccountView` calls per keystroke. */
	isUsernameAvailable: (opts: {
		username: string
	}) => AuthClientResult<{ available: boolean }>
	/** Core `emailAndPassword` client methods — `ForgotPasswordView`/`ResetPasswordView`'s own real logic. The server endpoint is `/request-password-reset` (confirmed against the installed better-auth's own route source, not guessed) — `requestPasswordReset`, not `forgetPassword`. `redirectTo` is what determines the path the emailed reset link ultimately lands on (see `www/src/api/auth/auth.ts`'s own `sendResetPassword` callback). */
	requestPasswordReset: (opts: {
		email: string
		redirectTo?: string
	}) => AuthClientResult<unknown>
	resetPassword: (opts: {
		newPassword: string
		token: string
	}) => AuthClientResult<unknown>
	/** From `twoFactor()`'s own client plugin — optional, feature-detected. Only the one method the login flow's OTP challenge step calls. */
	twoFactor?: {
		verifyTotp: (opts: { code: string }) => AuthClientResult<unknown>
	}
	admin: {
		listUsers: (opts: {
			query: Record<string, unknown>
		}) => Promise<{ data: { users: RealUserRow[] } | null; error: unknown }>
		createUser: (opts: {
			email: string
			password: string
			name: string
			role?: 'admin' | 'user'
		}) => Promise<{ data: { user: RealUserRow } | null; error: unknown }>
		updateUser: (opts: {
			userId: string
			data: Record<string, unknown>
		}) => Promise<{ data: unknown; error: unknown }>
		removeUser: (opts: {
			userId: string
		}) => Promise<{ data: unknown; error: unknown }>
	}
}

type UsersDataSource = {
	queryClient: QueryClient
	authClient: BetterAuthAdminClient
}
let usersDataSource: UsersDataSource | undefined

/** Call once, client-side, before the `users` collection is ever rendered — e.g. alongside the app's root providers. */
export function registerUsersDataSource(source: UsersDataSource) {
	usersDataSource = source
}

/** `undefined` if no collection has `auth: true` (`registerUsersDataSource()` was never called) — e.g. `Topbar`'s sign-out button uses this to decide whether it has anything to call. */
export function getAuthClient(): BetterAuthAdminClient | undefined {
	return usersDataSource?.authClient
}

function toUserDocumentRow(
	user: RealUserRow
): DocumentRow<Record<string, unknown>> {
	const { id, createdAt, updatedAt, banned, role, ...rest } = user
	return {
		id,
		// Spreads every field the real response actually has — including any
		// `user.additionalFields` a consumer's `auth.ts` defines that this
		// package has never heard of — then layers the two derived-only
		// fields (`title`/`slug`, needed by `withBaseFields`) and normalizes
		// `role` (better-auth can return it as a single value or an array).
		data: {
			...rest,
			role: Array.isArray(role) ? role[0] : (role ?? 'user'),
			title: user.name,
			slug: user.username || user.email
		},
		status: banned ? 'unpublished' : 'published',
		createdAt: new Date(createdAt).toISOString(),
		updatedAt: new Date(updatedAt).toISOString()
	}
}

/** Throws if the call failed — `authClient` actions return `{data, error}` rather than rejecting. */
export function unwrap<T>({
	data,
	error
}: {
	data: T | null
	error: unknown
}): T {
	if (error) {
		if (error instanceof Error) throw error
		// better-auth client errors are plain objects (e.g. `{message, status, statusText}`),
		// not `Error` instances — `String(error)` on one of these is just `"[object Object]"`.
		const message =
			(typeof error === 'object' && error && 'message' in error
				? String((error as { message?: unknown }).message)
				: undefined) ?? JSON.stringify(error)
		throw new Error(message)
	}
	return data as T
}

/**
 * Creates a real account and only then writes the confirmed row into the
 * collection's synced store — deliberately bypassing the normal
 * `collection.insert()` optimistic-mutation flow. A locally-generated
 * temp id (what `collection.insert()` would use) can never match the id
 * better-auth assigns server-side, so navigating to it immediately (before
 * the real `createUser` call resolves) points at a row that's never
 * reconciled with the real account. Returns the real id to navigate to.
 */
export async function createRealUser(
	collection: ContentCollection,
	input: {
		email: string
		password: string
		name: string
		role?: 'admin' | 'user'
	}
): Promise<string> {
	if (!usersDataSource) {
		throw new Error(
			'createRealUser() called before registerUsersDataSource() — see db/collections.ts.'
		)
	}
	const { authClient } = usersDataSource
	const { user } = unwrap(await authClient.admin.createUser(input))
	;(
		collection as unknown as {
			utils: {
				writeInsert: (row: DocumentRow<Record<string, unknown>>) => void
			}
		}
	).utils.writeInsert(toUserDocumentRow(user))
	return user.id
}

function createUsersCollection() {
	if (!usersDataSource) {
		throw new Error(
			'The `users` collection was rendered before registerUsersDataSource() was called — see db/collections.ts.'
		)
	}
	const { queryClient, authClient } = usersDataSource

	return createCollection(
		queryCollectionOptions<DocumentRow<Record<string, unknown>>>({
			queryKey: ['admin-users'],
			queryClient,
			getKey: (item) => item.id,
			// `auth: true` is a very different kind of collection from every
			// other one — a real, rate-limited backend endpoint, not free
			// `localStorage` reads. `staleTime: Infinity` means this loads
			// once and is never considered stale on its own — no refetch on
			// remount/window-focus/reconnect. The only thing that should ever
			// trigger a fresh `list-users` call again is a real local action
			// (create/update/delete) actually succeeding — each of those
			// explicitly calls `collection.utils.refetch()` below once its
			// own API call resolves, rather than leaving it to a passive,
			// time-based policy to decide when to re-hit the backend.
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			queryFn: async () => {
				const { users } = unwrap(
					await authClient.admin.listUsers({ query: {} })
				)
				return users.map(toUserDocumentRow)
			},
			// No `onInsert` — creation never goes through `collection.insert()`,
			// see `createRealUser()` above for why (a locally-generated temp id
			// can never match the id better-auth assigns server-side).
			onUpdate: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						const original = mutation.original.data as Record<string, unknown>
						const modified = mutation.modified.data as Record<string, unknown>
						// Only send fields that actually changed — `publish()` (see
						// `db/use-document.ts`) always replaces the whole `data`
						// object, so without this every publish would resend every
						// field, including ones the admin never touched. That
						// matters here specifically: a validation quirk on one
						// untouched field (e.g. `username`) would otherwise block
						// saving changes to everything else. `title`/`slug` are
						// always excluded too — they only exist because
						// `withBaseFields` requires every collection to have them;
						// for a real user they're derived-only (see
						// `toUserDocumentRow`), never real columns. Same for
						// `password`: `adminUpdateUser` rejects the whole request
						// with a 400 if it's present at all, and a row's cached
						// `data` should never carry one, but defensively excluding
						// it here means it can never resurface this exact bug again.
						const changed: Record<string, unknown> = {}
						for (const key of Object.keys(modified)) {
							if (key === 'title' || key === 'slug' || key === 'password') {
								continue
							}
							if (!Object.is(modified[key], original[key])) {
								changed[key] = modified[key]
							}
						}
						if (Object.keys(changed).length === 0) return
						unwrap(
							await authClient.admin.updateUser({
								userId: mutation.key as string,
								data: changed
							})
						)
						// better-auth's `updateUser` response isn't typed to this
						// package's `RealUserRow` shape (see `BetterAuthAdminClient`
						// above), so the already-known local optimistic value
						// (`mutation.modified`) is written back instead of the
						// server's own response — same effect, no cast needed.
						collection.utils.writeUpdate(mutation.modified)
					})
				)
			},
			onDelete: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						unwrap(
							await authClient.admin.removeUser({
								userId: mutation.key as string
							})
						)
					})
				)
				collection.utils.writeDelete(
					transaction.mutations.map((mutation) => mutation.key as string)
				)
			}
		})
	) as unknown as ContentCollection
}

const contentCollectionCache = new Map<string, ContentCollection>()

/**
 * The plain-`string`-keyed lookup `contentCollections`'s own Proxy uses
 * internally — exported directly (unlike the Proxy, which is typed to this
 * app's own closed `CollectionSlug`) so a plugin package can fetch its own,
 * dynamically-registered collection (e.g. `@base/plugin-form-builder`'s
 * `forms`) without needing that slug to be a member of a union it doesn't
 * own. Safe for any slug actually present in `collectionsBySlug` at call
 * time (i.e. after `baseConfig()` has registered it) — same caching
 * behavior `contentCollections[slug]` already has.
 */
export function getContentCollection(slug: string): ContentCollection {
	let collection = contentCollectionCache.get(slug)
	if (!collection) {
		const config = collectionsBySlug[slug as CollectionSlug]
		collection = config.auth
			? createUsersCollection()
			: createContentCollection(slug)
		contentCollectionCache.set(slug, collection)
	}
	return collection
}

export const contentCollections: Record<CollectionSlug, ContentCollection> =
	new Proxy({} as Record<CollectionSlug, ContentCollection>, {
		get: (_target, slug: string) => getContentCollection(slug)
	})

export type DraftCollection = ReturnType<typeof createDraftCollection>

/**
 * The actual local-first layer — a real, per-collection `localStorage`
 * collection (`localStorageCollectionOptions`, from `@tanstack/db` via
 * `@tanstack/react-db`'s re-export), with no `onInsert`/`onUpdate`/
 * `onDelete` at all. Every mutation against one of these is a pure
 * `localStorage` write: no network call, ever, for either a brand-new
 * document or an edit to an existing one. `db/use-document.ts` is the only
 * thing that reads/writes these directly — `publish()` there is what
 * eventually copies a draft's current data into the matching
 * `contentCollections` entry above, the one and only point any of this
 * reaches the real `/api/<collection>` backend. Doesn't need
 * `registerContentDataSource()` (or any registration at all) to exist, so
 * unlike `contentCollections` this doesn't need a circular-import-safe lazy
 * Proxy for *that* reason — the per-slug cache below is purely to avoid
 * constructing the same collection twice.
 */
function createDraftCollection(slug: string) {
	return createCollection(
		localStorageCollectionOptions<DocumentRow<Record<string, unknown>>>({
			storageKey: `base-config:draft:${slug}`,
			getKey: (item) => item.id
		})
	)
}

const draftCollectionCache = new Map<string, DraftCollection>()

function getDraftCollection(slug: string): DraftCollection {
	let collection = draftCollectionCache.get(slug)
	if (!collection) {
		collection = createDraftCollection(slug)
		draftCollectionCache.set(slug, collection)
	}
	return collection
}

export const draftCollections: Record<CollectionSlug, DraftCollection> =
	new Proxy({} as Record<CollectionSlug, DraftCollection>, {
		get: (_target, slug: string) => getDraftCollection(slug)
	})

function toGlobalDocumentRow(
	row: ContentGlobalRow
): DocumentRow<Record<string, unknown>> {
	return {
		id: row.slug,
		data: row.data,
		status: 'published' as const,
		createdAt: row.updatedAt,
		updatedAt: row.updatedAt
	}
}

/**
 * The real, `/api/globals*`-backed side of a global — same relationship to
 * `draftGlobalsCollection` below that `createContentCollection` has to
 * `draftCollections` (see that function's own doc comment). One row per
 * global slug instead of per-collection-per-document. No `onDelete`:
 * globals are never deleted, only ever edited (see `content-schema.ts`'s
 * `globals` table, one row per slug, created lazily on first publish via
 * `useDocument`'s draft-seeding effect).
 */
function createGlobalsCollection() {
	const { queryClient, client } = requireContentDataSource()

	return createCollection(
		queryCollectionOptions<DocumentRow<Record<string, unknown>>>({
			queryKey: ['content', 'globals'],
			queryClient,
			getKey: (item) => item.id,
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			queryFn: async () => {
				const rows = await client.listGlobals()
				return rows.map(toGlobalDocumentRow)
			},
			onInsert: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						const updated = await client.updateGlobal({
							slug: mutation.modified.id,
							data: mutation.modified.data as Record<string, unknown>
						})
						collection.utils.writeInsert(toGlobalDocumentRow(updated))
					})
				)
			},
			onUpdate: async ({ transaction, collection }) => {
				await Promise.all(
					transaction.mutations.map(async (mutation) => {
						const original = mutation.original.data as Record<string, unknown>
						const modified = mutation.modified.data as Record<string, unknown>
						const fields: Record<string, unknown> = {}
						for (const key of Object.keys(modified)) {
							if (!Object.is(modified[key], original[key])) {
								fields[key] = modified[key]
							}
						}
						if (Object.keys(fields).length === 0) return
						const updated = await client.updateGlobal({
							slug: mutation.key as string,
							data: fields
						})
						collection.utils.writeUpdate(toGlobalDocumentRow(updated))
					})
				)
			}
		})
	)
}

/**
 * Lazily creates the real collection on first property access rather than
 * at module-eval time — `createGlobalsCollection()` needs
 * `registerContentDataSource()` (called by `baseConfig()`) to have already
 * run, which isn't guaranteed yet at the point this module itself is first
 * imported (see "The circular-import trap" in the project's own docs).
 * `contentCollections` above gets this for free from its per-slug Proxy;
 * `globalsCollection` is a single eagerly-exported object, so it needs its
 * own lazy indirection to get the same safety.
 */
function createLazyCollection<T extends object>(factory: () => T): T {
	let instance: T | undefined
	const resolve = () => (instance ??= factory())

	return new Proxy({} as T, {
		get: (_target, prop, receiver) => {
			const target = resolve()
			const value = Reflect.get(target, prop, receiver)
			return typeof value === 'function' ? value.bind(target) : value
		}
	})
}

export const globalsCollection: ContentCollection = createLazyCollection(
	createGlobalsCollection
)

/**
 * The `localStorage`-backed draft counterpart to `globalsCollection` above
 * — one row per global slug, same as the remote side, but with no mutation
 * handlers at all, so every edit is a pure local write (see
 * `draftCollections`' own doc comment for the full rationale). Unlike
 * `globalsCollection`, this doesn't need `createLazyCollection()` — it has
 * no dependency on `registerContentDataSource()` having run yet, so it's
 * safe to construct eagerly at module-eval time (and, per
 * `localStorageCollectionOptions`'s own documented fallback, safe under SSR
 * too — it just no-ops to an in-memory store there).
 */
export const draftGlobalsCollection: DraftCollection = createCollection(
	localStorageCollectionOptions<DocumentRow<Record<string, unknown>>>({
		storageKey: 'base-config:draft:globals',
		getKey: (item) => item.id
	})
)

// --- Keywords: not a separate collection — the shared, site-wide keyword
// pool *is* the `keywords` global's own document (`draftGlobalsCollection`/
// `globalsCollection`, id `'keywords'`; see `hooks/config/globals/keywords.ts`),
// so it's both auto-populated from every `KeywordsInput.onCreate` below *and*
// directly editable at `/admin/keywords`, with no second, disconnected copy
// of the data. Local-first like every other edit: `registerKeyword` only
// ever writes to the *draft* — typing a new keyword on some unrelated
// document's `meta`/`relations` field must never fire a real
// `/api/globals/keywords` write on every keystroke. `publishKeywordPool()`
// is the one place that draft ever reaches the real backend, called
// alongside a normal document publish (see `collection-form.tsx`'s
// `runPublish`) — "a page using a new keyword publishes, the keyword pool
// publishes with it," rather than needing its own separate manual publish
// step on `/admin/keywords`. ---

const KEYWORDS_GLOBAL_ID = 'keywords'

// Matches the `keywords` global's own field shape (`hooks/config/globals/keywords.ts`)
// — a plain `array` of `{label}` rows, not a flat `string[]`, since that
// global renders as a real list (add/remove/see-each-row), not the
// `keywords`-type combobox used for *consuming* the pool onto a document.
type KeywordsGlobalData = { keywords?: { label: string }[] }

// A stable reference for the "no keywords yet" case — returning a fresh `[]`
// literal every call would make this hook's result a new array on every
// render, which is exactly the kind of unstable value that breaks a
// consumer's `useEffect([suggestions])` into an infinite render loop (see
// `KeywordsInput`'s own defensive fix for the other half of this).
const EMPTY_KEYWORDS: string[] = []

/**
 * All globally known keywords, live, flattened to plain strings — pass
 * straight to a `KeywordsInput`'s `suggestions` prop. Reads the *draft* pool
 * (seeded from whatever's already published, the first time any admin
 * screen touches keywords in this browser — mirrors `useDocument`'s own
 * draft-seeding effect, just scoped to this one global instead of a whole
 * hook) so a keyword typed moments ago on another open document shows up as
 * a suggestion immediately, without waiting for a publish. Filters out
 * anything that isn't a real, non-empty label — a row an admin just clicked
 * "Add" on but hasn't typed into yet has no `label` at all (the array
 * field's default add button pushes a bare `{}`), and shouldn't crash or
 * show up as a blank suggestion.
 */
export function useGlobalKeywordSuggestions(): string[] {
	const { data: remoteData, isLoading: remoteLoading } =
		useLiveQuery(globalsCollection)
	const { data: draftData } = useLiveQuery(draftGlobalsCollection)

	const remoteRow = remoteData.find((item) => item.id === KEYWORDS_GLOBAL_ID)
	const draftRow = draftData.find((item) => item.id === KEYWORDS_GLOBAL_ID)

	useEffect(() => {
		if (remoteLoading || draftGlobalsCollection.get(KEYWORDS_GLOBAL_ID)) {
			return
		}
		if (!remoteRow) return
		draftGlobalsCollection.insert({
			id: KEYWORDS_GLOBAL_ID,
			data: remoteRow.data,
			status: remoteRow.status,
			createdAt: remoteRow.createdAt,
			updatedAt: remoteRow.updatedAt
		})
		// Only re-seeds once, when the real pool first becomes available —
		// re-running on every `remoteRow` change would clobber local,
		// not-yet-published keyword edits with stale published data.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [remoteLoading])

	const keywordRows = (
		(draftRow ?? remoteRow)?.data as KeywordsGlobalData | undefined
	)?.keywords

	return useMemo(() => {
		if (!Array.isArray(keywordRows)) return EMPTY_KEYWORDS
		const labels = keywordRows
			.map((entry) => entry?.label)
			.filter(
				(label): label is string =>
					typeof label === 'string' && label.trim().length > 0
			)
		return labels.length > 0 ? labels : EMPTY_KEYWORDS
	}, [keywordRows])
}

/** Adds a keyword to the shared pool if it isn't already there (case-insensitive) — call from `KeywordsInput`'s `onCreate` wherever it's used, so new keywords typed on any document become suggestions everywhere else *and* show up as a row in the `keywords` global's own editor. A pure `localStorage` write, same as any other draft edit — see this section's own doc comment for why. */
export function registerKeyword(value: string) {
	const trimmed = value.trim()
	if (!trimmed) return

	const draftRow = draftGlobalsCollection.get(KEYWORDS_GLOBAL_ID)
	const remoteRow = globalsCollection.get(KEYWORDS_GLOBAL_ID)
	const currentKeywords =
		((draftRow ?? remoteRow)?.data as KeywordsGlobalData | undefined)
			?.keywords ?? []
	const alreadyExists = currentKeywords.some(
		(keyword) => keyword?.label?.toLowerCase() === trimmed.toLowerCase()
	)
	if (alreadyExists) return

	const nextKeywords = [...currentKeywords, { label: trimmed }]

	if (draftRow) {
		draftGlobalsCollection.update(KEYWORDS_GLOBAL_ID, (draft) => {
			;(draft.data as KeywordsGlobalData).keywords = nextKeywords
		})
		return
	}

	const now = new Date().toISOString()
	draftGlobalsCollection.insert({
		id: KEYWORDS_GLOBAL_ID,
		data: { keywords: nextKeywords },
		status: remoteRow?.status ?? 'published',
		createdAt: remoteRow?.createdAt ?? now,
		updatedAt: now
	})
}

/**
 * Pushes the local keyword-pool draft live if it actually differs from
 * what's currently published — no-ops otherwise. Called from
 * `collection-form.tsx`'s `runPublish`, right after a document's own
 * publish succeeds, so newly-typed keywords go live *with* whatever
 * document introduced them rather than needing a separate trip to
 * `/admin/keywords` (see this section's own doc comment). Safe to call
 * unconditionally, including for collections that don't touch keywords at
 * all (`users`) — it only ever writes when the draft and remote pools
 * actually disagree.
 */
export async function publishKeywordPool(): Promise<void> {
	const draft = draftGlobalsCollection.get(KEYWORDS_GLOBAL_ID)
	if (!draft) return

	const remote = globalsCollection.get(KEYWORDS_GLOBAL_ID)
	if (remote && JSON.stringify(remote.data) === JSON.stringify(draft.data)) {
		return
	}

	if (!remote) {
		await globalsCollection.insert({ ...draft }).isPersisted.promise
		return
	}

	await globalsCollection.update(KEYWORDS_GLOBAL_ID, (row) => {
		row.data = draft.data
		row.updatedAt = new Date().toISOString()
	}).isPersisted.promise
}
