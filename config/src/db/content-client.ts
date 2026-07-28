import { mutationOptions, queryOptions } from '@tanstack/react-query'
import type {
	CreateDocumentBody,
	FindByIdOptions,
	FindGlobalOptions,
	FindOptions,
	UpdateDocumentBody
} from './collections'
import { requireContentDataSource } from './collections'

/**
 * The ready-to-import Local API — Payload's own shape
 * (`payload.find`/`findByID`/`create`/`update`/`delete`/`findGlobal`/
 * `updateGlobal`), not a client a consumer builds themselves. Reads
 * `requireContentDataSource()` at call time (populated once by
 * `baseConfig({contentClient: ...})`, see `collections.ts`), so this can be
 * imported directly — `import { base } from '@base/config'` — with no
 * client-construction step in `www` at all. Every call underneath still
 * goes through the consumer's own Hono RPC client (`ContentApiClient`,
 * built by `createContentApiClient`) — never `fetch` directly.
 *
 * **Query-based, not promise-based.** Payload's real Local API returns
 * promises you `await` directly; this instead returns TanStack Query
 * `queryOptions()`/`mutationOptions()` objects — `useQuery(base.find({...}))`,
 * `useMutation(base.createMutation('posts'))` — so reads get real
 * caching/dedup/refetch behavior for free instead of firing a fresh
 * request on every render, and writes get `useMutation`'s
 * pending/error/optimistic-update machinery instead of a bare `await`.
 * Every mutation invalidates the matching `find`/`findByID`/`findGlobal`
 * query keys on success, so a component calling `base.createMutation(...)`
 * doesn't also have to hand-wire cache invalidation itself.
 */
export const base = {
	find: (options: FindOptions) =>
		queryOptions({
			queryKey: [
				'base',
				'find',
				options.collection,
				options.where ?? null,
				options.limit ?? null,
				options.page ?? null
			],
			queryFn: () => requireContentDataSource().client.find(options)
		}),

	findByID: (options: FindByIdOptions) =>
		queryOptions({
			queryKey: ['base', 'findByID', options.collection, options.id],
			queryFn: () => requireContentDataSource().client.findByID(options)
		}),

	findGlobal: (options: FindGlobalOptions) =>
		queryOptions({
			queryKey: ['base', 'findGlobal', options.slug],
			queryFn: () => requireContentDataSource().client.findGlobal(options)
		}),

	createMutation: (collection: string) =>
		mutationOptions({
			mutationKey: ['base', 'create', collection],
			mutationFn: (data: CreateDocumentBody) =>
				requireContentDataSource().client.create({ collection, data }),
			onSuccess: () => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'find', collection]
				})
			}
		}),

	updateMutation: (collection: string) =>
		mutationOptions({
			mutationKey: ['base', 'update', collection],
			mutationFn: ({ id, data }: { id: string; data: UpdateDocumentBody }) =>
				requireContentDataSource().client.update({ collection, id, data }),
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

	deleteMutation: (collection: string) =>
		mutationOptions({
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

	updateGlobalMutation: (slug: string) =>
		mutationOptions({
			mutationKey: ['base', 'updateGlobal', slug],
			mutationFn: (data: Record<string, unknown>) =>
				requireContentDataSource().client.updateGlobal({ slug, data }),
			onSuccess: () => {
				const { queryClient } = requireContentDataSource()
				queryClient.invalidateQueries({
					queryKey: ['base', 'findGlobal', slug]
				})
			}
		})
}
