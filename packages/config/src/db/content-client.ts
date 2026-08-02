import { mutationOptions, queryOptions } from '@tanstack/react-query'
import type { UnusedSkipTokenOptions } from '@tanstack/react-query'
import type { DataTag } from '@tanstack/query-core'
import type {
	ContentDocumentRow,
	ContentGlobalRow,
	ContentPaginatedResult,
	CreateDocumentBody,
	FindByIdOptions,
	FindGlobalOptions,
	FindOptions,
	UpdateDocumentBody
} from './collections'
import { requireContentDataSource } from './collections'
import type {
	GeneratedCollectionDoc,
	GeneratedCollectionSlug,
	GeneratedGlobalDoc,
	GeneratedGlobalSlug
} from '../base.types'

/** A document row typed to a specific collection's real field shape once a consumer's own `src/config/base.types.ts` has been generated (see `GeneratedCollectionDoc`'s own doc comment, `base.types.ts`); `Record<string, unknown>` otherwise, identical to this package's own previous behavior. */
export type TypedDocumentRow<TSlug extends string> = Omit<
	ContentDocumentRow,
	'data'
> & {
	data: GeneratedCollectionDoc<TSlug>
}

/** Same idea as `TypedDocumentRow`, for a global row. */
export type TypedGlobalRow<TSlug extends string> = Omit<
	ContentGlobalRow,
	'data'
> & {
	data: GeneratedGlobalDoc<TSlug>
}

/**
 * Explicit return-type alias for `find`/`findByID`/`findGlobal`, built from
 * TanStack Query's own public `UnusedSkipTokenOptions`/`DataTag` exports
 * instead of leaving the return type inferred. This isn't cosmetic:
 * confirmed via a real, isolated reproduction that `tsdown`'s declaration
 * bundler drops the import for `@tanstack/query-core`'s `dataTagSymbol`/
 * `dataTagErrorSymbol` (the two real `unique symbol`s `queryKey`'s
 * `DataTag` brand is keyed on) whenever it has to structurally re-expand an
 * *inferred* return type across this package's own boundary, silently
 * breaking `useQuery`/`useSuspenseQuery`'s automatic `TData` inference from
 * `queryKey` alone (the consumer sees `data: unknown` despite `find(...)`'s
 * own return type being correctly typed). An explicit annotation avoids the
 * expansion entirely, staying an unexpanded reference the consumer's own
 * compiler resolves against their own real, correctly-imported
 * `@tanstack/query-core`. **Must be built from `UnusedSkipTokenOptions`
 * specifically, not `ReturnType<typeof queryOptions<...>>`**: `queryOptions`
 * is overloaded (`DefinedInitialDataOptions`/`UnusedSkipTokenOptions`/
 * `UndefinedInitialDataOptions`), and `ReturnType<>` on an overloaded
 * function always picks the *last* signature (`UndefinedInitialDataOptions`,
 * which permits `queryFn: skipToken`), not the one a real call with a
 * literal `queryFn` and no `initialData` actually resolves to
 * (`UnusedSkipTokenOptions`, no skipToken) - confirmed this mismatch is
 * exactly what makes `useSuspenseQuery` (which forbids skipToken entirely)
 * reject it.
 */
type FindResult<TSlug extends string> = UnusedSkipTokenOptions<
	ContentPaginatedResult<TypedDocumentRow<TSlug>>,
	Error,
	ContentPaginatedResult<TypedDocumentRow<TSlug>>,
	readonly unknown[]
> & {
	queryKey: DataTag<
		readonly unknown[],
		ContentPaginatedResult<TypedDocumentRow<TSlug>>,
		Error
	>
}

/** Same idea as `FindResult`, for `findByID`. */
type FindByIdResult<TSlug extends string> = UnusedSkipTokenOptions<
	TypedDocumentRow<TSlug>,
	Error,
	TypedDocumentRow<TSlug>,
	readonly unknown[]
> & {
	queryKey: DataTag<readonly unknown[], TypedDocumentRow<TSlug>, Error>
}

/** Same idea as `FindResult`, for `findGlobal`. */
type FindGlobalResult<TSlug extends string> = UnusedSkipTokenOptions<
	TypedGlobalRow<TSlug> | null,
	Error,
	TypedGlobalRow<TSlug> | null,
	readonly unknown[]
> & {
	queryKey: DataTag<readonly unknown[], TypedGlobalRow<TSlug> | null, Error>
}

/**
 * The ready-to-import Local API, Payload's own shape
 * (`payload.find`/`findByID`/`create`/`update`/`delete`/`findGlobal`/
 * `updateGlobal`), not a client a consumer builds themselves. Reads
 * `requireContentDataSource()` at call time (populated once by
 * `baseConfig({contentClient: ...})`, see `collections.ts`), so this can be
 * imported directly, `import { base } from '@baseconfig/core'`, with no
 * client-construction step in `www` at all. Every call underneath still
 * goes through the consumer's own Hono RPC client (`ContentApiClient`,
 * built by `createContentApiClient`), never `fetch` directly.
 *
 * **Query-based, not promise-based.** Payload's real Local API returns
 * promises you `await` directly; this instead returns TanStack Query
 * `queryOptions()`/`mutationOptions()` objects, `useQuery(base.find({...}))`,
 * `useMutation(base.createMutation('posts'))`, so reads get real
 * caching/dedup/refetch behavior for free instead of firing a fresh
 * request on every render, and writes get `useMutation`'s
 * pending/error/optimistic-update machinery instead of a bare `await`.
 * Every mutation invalidates the matching `find`/`findByID`/`findGlobal`
 * query keys on success, so a component calling `base.createMutation(...)`
 * doesn't also have to hand-wire cache invalidation itself.
 *
 * **`collection`/`slug` and the returned `.data` shape are both fully typed
 * once a consumer has generated `src/config/base.types.ts`** (mirroring
 * Payload's own `payload.find({collection: 'posts'})`, see that file's own
 * doc comment for the generator and the `declare module` mechanism this
 * reads). Before that file exists, every method here still accepts a plain
 * `string` and returns `Record<string, unknown>` for `.data`, exactly this
 * package's own previous, un-generated behavior, nothing breaks for an
 * existing consumer who hasn't run the generator yet.
 */
export const base = {
	find: <TSlug extends GeneratedCollectionSlug>(
		options: { collection: TSlug } & Omit<FindOptions, 'collection'>
	): FindResult<TSlug> =>
		queryOptions<ContentPaginatedResult<TypedDocumentRow<TSlug>>>({
			queryKey: [
				'base',
				'find',
				options.collection,
				options.where ?? null,
				options.limit ?? null,
				options.page ?? null
			],
			queryFn: () =>
				requireContentDataSource().client.find(options) as Promise<
					ContentPaginatedResult<TypedDocumentRow<TSlug>>
				>
		}),

	findByID: <TSlug extends GeneratedCollectionSlug>(
		options: { collection: TSlug } & Omit<FindByIdOptions, 'collection'>
	): FindByIdResult<TSlug> =>
		queryOptions<TypedDocumentRow<TSlug>>({
			queryKey: ['base', 'findByID', options.collection, options.id],
			queryFn: () =>
				requireContentDataSource().client.findByID(options) as Promise<
					TypedDocumentRow<TSlug>
				>
		}),

	findGlobal: <TSlug extends GeneratedGlobalSlug>(
		options: { slug: TSlug } & Omit<FindGlobalOptions, 'slug'>
	): FindGlobalResult<TSlug> =>
		queryOptions<TypedGlobalRow<TSlug> | null>({
			queryKey: ['base', 'findGlobal', options.slug],
			queryFn: () =>
				requireContentDataSource().client.findGlobal(
					options
				) as Promise<TypedGlobalRow<TSlug> | null>
		}),

	createMutation: <TSlug extends GeneratedCollectionSlug>(collection: TSlug) =>
		mutationOptions<TypedDocumentRow<TSlug>, Error, CreateDocumentBody>({
			mutationKey: ['base', 'create', collection],
			mutationFn: (data: CreateDocumentBody) =>
				requireContentDataSource().client.create({
					collection,
					data
				}) as Promise<TypedDocumentRow<TSlug>>,
			onSuccess: () => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'find', collection]
				})
			}
		}),

	updateMutation: <TSlug extends GeneratedCollectionSlug>(collection: TSlug) =>
		mutationOptions<
			TypedDocumentRow<TSlug>,
			Error,
			{ id: string; data: UpdateDocumentBody }
		>({
			mutationKey: ['base', 'update', collection],
			mutationFn: ({ id, data }: { id: string; data: UpdateDocumentBody }) =>
				requireContentDataSource().client.update({
					collection,
					id,
					data
				}) as Promise<TypedDocumentRow<TSlug>>,
			onSuccess: (_doc, variables) => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'find', collection]
				})
				queryClient.invalidateQueries({
					queryKey: ['base', 'findByID', collection, variables.id]
				})
			}
		}),

	deleteMutation: <TSlug extends GeneratedCollectionSlug>(collection: TSlug) =>
		mutationOptions<void, Error, string>({
			mutationKey: ['base', 'delete', collection],
			mutationFn: (id: string) =>
				requireContentDataSource().client.delete({ collection, id }),
			onSuccess: () => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'find', collection]
				})
			}
		}),

	updateGlobalMutation: <TSlug extends GeneratedGlobalSlug>(slug: TSlug) =>
		mutationOptions<TypedGlobalRow<TSlug>, Error, Record<string, unknown>>({
			mutationKey: ['base', 'updateGlobal', slug],
			mutationFn: (data: Record<string, unknown>) =>
				requireContentDataSource().client.updateGlobal({
					slug,
					data
				}) as Promise<TypedGlobalRow<TSlug>>,
			onSuccess: () => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'findGlobal', slug]
				})
			}
		})
}
