import {
	expandFields,
	flattenTabFields,
	type LeafFieldConfig
} from '../fields/schema'
import type { FieldConfig, TabConfig } from '../fields/types'

/**
 * The TypeScript-emitting sibling of `content-schema.ts`'s own
 * `buildContentSchemaSource()`: same "walk the registered config, emit
 * generated source" shape, same input (one entry per collection/global,
 * see `ContentTypeEntry`), but emitting a real per-collection TypeScript
 * interface plus the `declare module '@baseconfig/core'` augmentation block
 * (see `base.types.ts`'s `GeneratedCollectionTypes`/`GeneratedGlobalTypes`
 * for the mechanism this plugs into, confirmed empirically before writing
 * this file) instead of a Drizzle table. Reuses `expandFields`/
 * `flattenTabFields` (`fields/schema.ts`), the exact same container-
 * resolution logic `baseFieldSchema`'s own zod-emitting switch already
 * relies on, so the two can't drift apart on "what does a `row`/`group`/
 * `tabs`-as-field container do to a dotted path."
 *
 * **`blocks` isn't given a real per-block-type union here, deliberately**:
 * that would need to also walk the registered `blocksBySlug` (a separate,
 * bigger generator concern, not attempted in this pass, same "not done
 * yet" category as the `join` field or field-level `unique`/`index`). Maps
 * to `unknown[]`, matching this field type's own already-opaque runtime
 * schema shape (`z.array(z.unknown())`) when `schemaResolvers.blocks` isn't
 * supplied to `baseFieldSchema`.
 */
export type ContentTypeEntry = {
	slug: string
	isGlobal: boolean
	/** Required for a collection entry (`isGlobal: false`), the raw `tabs` `CollectionConfig['tabs']` retained (see that field's own doc comment, `base.types.ts`). */
	tabs?: TabConfig<string, string>[]
	/** Required for a non-custom global entry (`isGlobal: true`), the raw `fields` `GlobalConfig['fields']` retained. A `custom: true` global has neither `tabs` nor `fields` (see `GlobalConfig['custom']`) and is skipped entirely, same as it already is in `content-schema.ts`'s own entries list (built by `cli.ts`). */
	fields?: FieldConfig<string, string>[]
}

/** Every external type this generator can reference, keyed by the field type that needs it, so the generated file only imports what it actually used, not a blanket unconditional list (this repo's own tsconfig, and likely a consumer's, enables `noUnusedLocals`, an unused import is a real compile error, not just a lint nit). */
const EXTERNAL_TYPE_IMPORTS: Record<string, string> = {
	BasiccnContent: '@baseconfig/ui/basiccn',
	UploadValue: '@baseconfig/core',
	RelationshipValue: '@baseconfig/core',
	MetaValue: '@baseconfig/core',
	RelationsValue: '@baseconfig/core',
	NavMenuValue: '@baseconfig/core',
	LinkItemValue: '@baseconfig/core'
}

function toInterfaceName(slug: string): string {
	return slug
		.split('-')
		.map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
		.join('')
}

function isValidPropertyName(key: string): boolean {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
}

function propertyKey(key: string): string {
	return isValidPropertyName(key) ? key : JSON.stringify(key)
}

type TypeLeaf = { typeSource: string; optional: boolean }
type TypeTree = { [key: string]: TypeLeaf | TypeTree }

function isTypeLeaf(value: TypeLeaf | TypeTree): value is TypeLeaf {
	return typeof (value as TypeLeaf).typeSource === 'string'
}

function setTypePath(tree: TypeTree, path: string, leaf: TypeLeaf): void {
	const parts = path.split('.')
	let node = tree
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]
		const existing = node[key]
		if (!existing || isTypeLeaf(existing)) node[key] = {}
		node = node[key] as TypeTree
	}
	node[parts[parts.length - 1]] = leaf
}

/** A nested branch (a dotted-path group, e.g. `seo.keywords` under `seo`) is always rendered optional, matching `treeToZodObject`'s own identical `.optional()` call on every nested branch in `fields/schema.ts` exactly, not just leaves whose own field explicitly opted out of `required`. */
function treeToBodySource(tree: TypeTree, indent: string): string {
	const lines: string[] = []
	for (const [key, value] of Object.entries(tree)) {
		if (isTypeLeaf(value)) {
			lines.push(
				`${indent}${propertyKey(key)}${value.optional ? '?' : ''}: ${value.typeSource}`
			)
		} else {
			lines.push(`${indent}${propertyKey(key)}?: {`)
			lines.push(treeToBodySource(value, `${indent}\t`))
			lines.push(`${indent}}`)
		}
	}
	return lines.join('\n')
}

/** Mirrors `baseFieldSchema` (`fields/schema.ts`) field-type by field-type, emitting a TS type source string per case instead of a zod call. Records any external type it references into `usedTypes` (see `EXTERNAL_TYPE_IMPORTS`) so the generated file's own import list stays accurate. */
function fieldTypeSource(
	field: LeafFieldConfig,
	usedTypes: Set<string>
): string {
	switch (field.type) {
		case 'text':
		case 'textarea':
		case 'date':
		case 'select':
		case 'radio':
		case 'password':
		case 'confirmPassword':
		case 'hidden':
		case 'code':
		case 'slug':
		case 'email':
			return 'string'
		case 'number':
			return 'number'
		case 'json':
			return 'unknown'
		case 'point':
			return '{ lat?: number; lng?: number }'
		case 'richtext':
			usedTypes.add('BasiccnContent')
			return 'BasiccnContent'
		case 'checkbox':
		case 'switch':
			return 'boolean'
		case 'keywords':
			return 'string[]'
		case 'upload':
			usedTypes.add('UploadValue')
			return 'UploadValue'
		case 'array':
			return `${objectTypeSource(field.fields, usedTypes)}[]`
		case 'relationship':
			usedTypes.add('RelationshipValue')
			return field.hasMany ? 'RelationshipValue[]' : 'RelationshipValue'
		case 'meta':
			usedTypes.add('MetaValue')
			return 'MetaValue'
		case 'relations':
			usedTypes.add('RelationsValue')
			return 'RelationsValue'
		case 'blocks':
			return 'unknown[]'
		case 'menu':
			usedTypes.add('NavMenuValue')
			return 'NavMenuValue'
		case 'links':
			usedTypes.add('LinkItemValue')
			return 'LinkItemValue[]'
	}
}

function buildTypeTree(
	fields: FieldConfig<any, any>[],
	usedTypes: Set<string>
): TypeTree {
	const tree: TypeTree = {}
	for (const field of expandFields(fields)) {
		setTypePath(tree, field.name, {
			typeSource: fieldTypeSource(field, usedTypes),
			optional: !field.required
		})
	}
	return tree
}

/** An inline object type for one `array` field's own item shape, a fresh, self-contained tree with no outer dotted-path prefix carried in, mirroring `baseFieldSchema`'s own `case 'array': return z.array(fieldsToSchema(field.fields, resolvers))`. */
function objectTypeSource(
	fields: FieldConfig<any, any>[],
	usedTypes: Set<string>
): string {
	const body = treeToBodySource(buildTypeTree(fields, usedTypes), '\t\t')
	return body ? `{\n${body}\n\t}` : '{}'
}

function entryInterfaceSource(
	entry: ContentTypeEntry,
	usedTypes: Set<string>
): string {
	const name = toInterfaceName(entry.slug)
	const fields = entry.isGlobal
		? (entry.fields ?? [])
		: flattenTabFields(entry.tabs ?? [])
	const body = treeToBodySource(buildTypeTree(fields, usedTypes), '\t')
	return body
		? `export interface ${name} {\n${body}\n}`
		: `export interface ${name} {}`
}

/**
 * Builds the full generated `src/config/base.types.ts` source: one TS
 * interface per collection/global (field-shape derived exactly the way
 * `content-schema.ts` derives its own SQL table, from the same
 * `tabs`/`fields` `cli.ts` already reads off the registry), plus the
 * `declare module '@baseconfig/core'` block that "injects" a
 * `GeneratedCollectionTypes`/`GeneratedGlobalTypes` entry per real slug
 * (see `base.types.ts`'s own doc comment for why these start out
 * deliberately empty and get merged into, not replaced).
 */
export function buildContentTypesSource(entries: ContentTypeEntry[]): string {
	const usedTypes = new Set<string>()
	const interfaces = entries.map((entry) =>
		entryInterfaceSource(entry, usedTypes)
	)

	const collectionEntries = entries.filter((entry) => !entry.isGlobal)
	const globalEntries = entries.filter((entry) => entry.isGlobal)

	const collectionMapBody = collectionEntries
		.map(
			(entry) =>
				`\t\t${propertyKey(entry.slug)}: ${toInterfaceName(entry.slug)}`
		)
		.join('\n')
	const globalMapBody = globalEntries
		.map(
			(entry) =>
				`\t\t${propertyKey(entry.slug)}: ${toInterfaceName(entry.slug)}`
		)
		.join('\n')

	const importsByModule = new Map<string, string[]>()
	for (const typeName of usedTypes) {
		const module = EXTERNAL_TYPE_IMPORTS[typeName]
		const list = importsByModule.get(module) ?? []
		list.push(typeName)
		importsByModule.set(module, list)
	}
	const importsBlock = [...importsByModule.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([module, names]) =>
				`import type { ${names.sort().join(', ')} } from '${module}'`
		)
		.join('\n')

	const augmentationBlock = [
		"declare module '@baseconfig/core' {",
		'\tinterface GeneratedCollectionTypes {',
		collectionMapBody,
		'\t}',
		'\tinterface GeneratedGlobalTypes {',
		globalMapBody,
		'\t}',
		'}'
	].join('\n')

	return [
		'// AUTO-GENERATED by `bun x base`: do not hand-edit.',
		importsBlock,
		interfaces.join('\n\n'),
		augmentationBlock
	]
		.filter((block) => block !== '')
		.join('\n\n')
}
