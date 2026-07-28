// The public entry point of `@base/config` — this is what a consuming app
// (e.g. `www/src/hooks/config`) imports to author a collection/global/the
// root config: `defineCollection`/`defineGlobal`/`baseConfig` plus the
// declarative vocabulary (`FieldConfig`/`TabConfig`) they take as input.
// Everything else in this package (`admin/`, `collections/`, `fields/`'s
// schema/renderer internals) is implementation — reachable by its own
// subpath when something genuinely needs it directly (e.g. a route
// importing `Topbar` from `@base/config/admin/views/topbar`), but not part of
// this authoring surface.

export { baseConfig, defineCollection, defineGlobal } from './define'
export type {
	AdminSettings,
	BaseConfigProps,
	CollectionFieldsProps
} from './base.types'
export type { FieldConfig, TabConfig } from './fields/types'
export { createContentApiClient } from './db/collections'
export type {
	ContentApiClient,
	ContentDocumentRow,
	ContentGlobalRow,
	ContentPaginatedResult,
	ContentRpcClient,
	CreateDocumentBody,
	CreateOptions,
	DeleteOptions,
	FindByIdOptions,
	FindGlobalOptions,
	FindOptions,
	UpdateDocumentBody,
	UpdateGlobalOptions,
	UpdateOptions
} from './db/collections'
export { base } from './db/content-client'
export type { WhereCondition } from './db/content-queries'
export { createStorageApiClient } from './fields/storage-client'
export type {
	StorageApiClient,
	StorageFile,
	StorageListing,
	StorageRpcClient
} from './fields/storage-client'
export { createBaseConfigRoute } from './api/route'
export type { BaseConfigRouteBindings } from './api/route'
export { createHandler } from './api/create-handler'
export type { AuthServerLike, CreateHandlerOptions } from './api/create-handler'
