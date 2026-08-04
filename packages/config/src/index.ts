// The public entry point of `@baseconfig/core`: this is what a consuming app
// (e.g. `www/src/hooks/config`) imports to author a collection/global/the
// root config: `defineCollection`/`defineGlobal`/`baseConfig` plus the
// declarative vocabulary (`FieldConfig`/`TabConfig`) they take as input.
// Everything else in this package (`admin/`, `collections/`, `fields/`'s
// schema/renderer internals) is implementation, reachable by its own
// subpath when something genuinely needs it directly (e.g. a route
// importing `Topbar` from `@baseconfig/core/admin/views/topbar`), but not part of
// this authoring surface.

export { baseConfig, defineCollection, defineGlobal } from './define'
export type {
	Access,
	AccessArgs,
	AccessUser,
	AdminSettings,
	BaseConfigProps,
	CollectionAccess,
	CollectionFieldsProps,
	CollectionHooks,
	GeneratedCollectionDoc,
	GeneratedCollectionSlug,
	GeneratedCollectionTypes,
	GeneratedGlobalDoc,
	GeneratedGlobalSlug,
	GeneratedGlobalTypes,
	GeneratedBlockSlug,
	GeneratedBlockTypes,
	GlobalAccess,
	HookContext,
	Plugin,
	ReadAccess
} from './base.types'
export type { FieldConfig, TabConfig } from './fields/types'
export type {
	LinkItemValue,
	LinkValue,
	MetaValue,
	NavMenuItemValue,
	NavMenuValue,
	RelationsValue
} from './collections/types'
export type { UploadValue } from './fields/schema'
export type { RelationshipValue } from './collections/fields/Relationship'
export { defineBlock, registerBlocks } from './collections/blocks'
export type {
	BlockConfig,
	BlockDefinition,
	BlockFieldsProps
} from './collections/blocks'
// Composite field components a consumer's own blocks are built from
// (`www/src/config/blocks`, Payload-style): every block's admin `Fields`
// composes these the same way this package's own (now consumer-owned)
// blocks always did. `BlocksField` is how a `grid`-style block nests other
// blocks; `LinksField`/`RelationGroupFields` are the `links`/`relations`
// composite renderers; `uploadFile`/`StorageWidget` give an upload-typed
// block's `Fields` a real storage round-trip (see `fields/renderer.tsx`'s
// generic `case 'upload'` for the wiring pattern).
export { BlocksField } from './collections/fields/BlocksField'
export { LinksField } from './collections/fields/Links'
export { RelationGroupFields } from './collections/fields/Relations'
export { uploadFile } from './fields/upload'
export {
	StorageWidget,
	type StorageWidgetProps,
	type StorageWidgetTriggerProps,
	type StorageWidgetValue
} from './admin/widgets/storage-widget'
export { createContentApiClient, getContentCollection } from './db/collections'
export type {
	ContentApiClient,
	ContentCollection,
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
export type {
	TypedDocumentRow,
	TypedGlobalRow
} from './db/content-client'
export { base } from './db/content-client'
export {
	createDocument,
	getDocument,
	updateDocument,
	deleteDocument,
	getGlobal,
	upsertGlobal
} from './db/content-queries'
export type {
	ContentDatabase,
	CreateDocumentInput,
	DocumentRow,
	GlobalRow,
	UpdateDocumentInput,
	WhereCondition
} from './db/content-queries'
export { createId } from './collections/id'
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
export type {
	ContentEndpoint,
	EndpointFactory,
	EndpointFactoryBindings
} from './api/content-route'
export { collectAccess, collectHooks } from './collections/registry'
