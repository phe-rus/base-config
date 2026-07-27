import { collectionsBySlug } from '../collections/registry'
import type { CollectionSlug } from '../collections/types'
import {
	createCollection,
	localStorageCollectionOptions,
	useLiveQuery
} from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'

export const statusValues = ['draft', 'published', 'unpublished'] as const
export type DocumentStatus = (typeof statusValues)[number]

export type DocumentRow<TData> = {
	id: string
	data: TData
	status: DocumentStatus
	createdAt: string
	updatedAt: string
}

const baseFieldsSchema = z.object({ title: z.string(), slug: z.string() })
export function withBaseFields<TSchema extends z.ZodTypeAny>(
	dataSchema: TSchema
) {
	return baseFieldsSchema.and(dataSchema)
}

/** A persisted CMS document — has the draft/published workflow (`status`/`createdAt`/`updatedAt`) every collection/global row needs. */
function createRowCollection(
	id: string,
	storageKey: string,
	dataSchema: z.ZodTypeAny
) {
	return createCollection(
		localStorageCollectionOptions({
			id,
			storageKey,
			getKey: (item) => item.id,
			schema: z.object({
				id: z.string(),
				data: dataSchema,
				status: z.enum(statusValues),
				createdAt: z.string(),
				updatedAt: z.string()
			})
		})
	)
}

export type ContentCollection = ReturnType<typeof createRowCollection>

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
	createdAt: string | Date
	updatedAt: string | Date
}

/**
 * The exact slice of `authClient.*`/`authClient.admin.*` this package calls
 * — structural on purpose, so any `authClient` with the `adminClient()`
 * plugin registered satisfies it without this package importing
 * `better-auth`'s own types.
 */
export type BetterAuthAdminClient = {
	/** Core client method (not part of `adminClient()`) — used by `Topbar`'s sign-out button. */
	signOut: () => Promise<{ data: unknown; error: unknown }>
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
						// Only send fields that actually changed — `flush()` (see
						// `db/use-document.ts`) always replaces the whole `data`
						// object, so without this every save would resend every
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
					})
				)
				await collection.utils.refetch()
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
				await collection.utils.refetch()
			}
		})
	) as unknown as ContentCollection
}

const contentCollectionCache = new Map<string, ContentCollection>()

function getContentCollection(slug: string): ContentCollection {
	let collection = contentCollectionCache.get(slug)
	if (!collection) {
		const config = collectionsBySlug[slug as CollectionSlug]
		collection = config.auth
			? createUsersCollection()
			: createRowCollection(
					slug,
					`pherus:${slug}`,
					withBaseFields(config.schema)
				)
		contentCollectionCache.set(slug, collection)
	}
	return collection
}

export const contentCollections: Record<CollectionSlug, ContentCollection> =
	new Proxy({} as Record<CollectionSlug, ContentCollection>, {
		get: (_target, slug: string) => getContentCollection(slug)
	})
export const globalsCollection: ContentCollection = createRowCollection(
	'globals',
	'pherus:globals',
	z.record(z.string(), z.unknown())
)

// --- Keywords: not a separate collection — the shared, site-wide keyword
// pool *is* the `keywords` global's own document in `globalsCollection` (see
// `hooks/config/globals/keywords.ts`), so it's both auto-populated from every
// `KeywordsInput.onCreate` below *and* directly editable at
// `/admin/globals/keywords`, with no second, disconnected copy of the data. ---

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
 * straight to a `KeywordsInput`'s `suggestions` prop. Filters out anything
 * that isn't a real, non-empty label — a row an admin just clicked "Add" on
 * but hasn't typed into yet has no `label` at all (the array field's default
 * add button pushes a bare `{}`), and shouldn't crash or show up as a blank
 * suggestion.
 */
export function useGlobalKeywordSuggestions(): string[] {
	const { data } = useLiveQuery(globalsCollection)
	const row = data.find((item) => item.id === KEYWORDS_GLOBAL_ID)
	const keywordRows = (row?.data as KeywordsGlobalData | undefined)?.keywords

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

/** Adds a keyword to the shared pool if it isn't already there (case-insensitive) — call from `KeywordsInput`'s `onCreate` wherever it's used, so new keywords typed on any document become suggestions everywhere else *and* show up as a row in the `keywords` global's own editor. */
export function registerKeyword(value: string) {
	const trimmed = value.trim()
	if (!trimmed) return

	const existing = globalsCollection.get(KEYWORDS_GLOBAL_ID)
	if (!existing) {
		const now = new Date().toISOString()
		globalsCollection.insert({
			id: KEYWORDS_GLOBAL_ID,
			data: { keywords: [{ label: trimmed }] },
			status: 'published',
			createdAt: now,
			updatedAt: now
		})
		return
	}

	const currentKeywords = (existing.data as KeywordsGlobalData).keywords ?? []
	const alreadyExists = currentKeywords.some(
		(keyword) => keyword?.label?.toLowerCase() === trimmed.toLowerCase()
	)
	if (!alreadyExists) {
		globalsCollection.update(KEYWORDS_GLOBAL_ID, (draft) => {
			const draftData = draft.data as KeywordsGlobalData
			draftData.keywords = [...(draftData.keywords ?? []), { label: trimmed }]
		})
	}
}
