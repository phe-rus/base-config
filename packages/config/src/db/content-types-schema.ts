import { blocksBySlug } from '../collections/blocks/registry'
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
 * (see `base.types.ts`'s `GeneratedCollectionTypes`/`GeneratedGlobalTypes`/
 * `GeneratedBlockTypes` for the mechanism this plugs into, confirmed
 * empirically before writing this file) instead of a Drizzle table. Reuses
 * `expandFields`/`flattenTabFields` (`fields/schema.ts`), the exact same
 * container-resolution logic `baseFieldSchema`'s own zod-emitting switch
 * already relies on, so the two can't drift apart on "what does a
 * `row`/`group`/`tabs`-as-field container do to a dotted path."
 *
 * **`blocks` gets one named, top-level interface per block, combined into a
 * `ContentBlock` union**: the generated file also emits, per registered
 * block, an `export interface <Name>` (see `blocksUnionSource`) whose body
 * is built by walking the same `blocksBySlug` registry `defineBlock` seeded,
 * each interface carrying `blockType: '<slug>'` (the literal discriminant)
 * plus the block's own `fields`, then a `ContentBlock` union referencing all
 * of those names, so a consumer's generated collection interface for a
 * `content` blocks field types that field as `ContentBlock[]` instead of
 * the `unknown[]` this used to map to, and each block's shape lives in its
 * own importable interface rather than inlined into one opaque union (the
 * same "the consumer owns the block tree" split the runtime already has,
 * see `collections/CLAUDE.md`). Names auto-derive as a PascalCase
 * form of the slug, `BlockConfig['interfaceName']` overrides that, and an
 * auto-derived collision gets a short content-hash suffix, all Payload's
 * exact rules. Same registry walk the runtime `getBlocksSchema()`
 * (`collections/blocks/registry.ts`) does, the generated types are its
 * compile-time counterpart.
 *
 * **A `blocks` field's own `blocks: [...]` restriction is honored in the
 * types too**: an unrestricted field maps to `ContentBlock[]`, but a field
 * with `blocks: ['cta', 'banner']` maps to `(CtaBlock | BannerBlock)[]`,
 * referencing the same shared `blockNames` map the union is built from, so
 * the generated type can't admit a block the config banned (and an unknown
 * slug throws at generation time, like the runtime does). The augmentation
 * block also emits a slug-keyed `GeneratedBlockTypes` map, which is what
 * makes `GeneratedBlockSlug` (`base.types.ts`) autocomplete that same
 * restriction list.
 */
export type ContentTypeEntry = {
	slug: string
	isGlobal: boolean
	/** Required for a collection entry (`isGlobal: false`), the raw `tabs` `CollectionConfig['tabs']` retained (see that field's own doc comment, `base.types.ts`). */
	tabs?: TabConfig<string, string>[]
	/** Required for a non-custom global entry (`isGlobal: true`), the raw `fields` `GlobalConfig['fields']` retained. A `custom: true` global has neither `tabs` nor `fields` (see `GlobalConfig['custom']`) and is skipped entirely, same as it already is in `content-schema.ts`'s own entries list (built by `cli.ts`). */
	fields?: FieldConfig<string, string>[]
}

/**
 * Mutable state threaded through every generator function so a nested
 * `fieldTypeSource` call (a `blocks` field inside an `array` item, say) can
 * flag that the module-level `ContentBlock` union must be emitted too.
 * `usedTypes` is the external-import tracker (`EXTERNAL_TYPE_IMPORTS`
 * below), `usesBlocks` is the "this run hit at least one `blocks` field"
 * flag that decides whether `blocksUnionSource` runs at all.
 */
type GenState = {
	usedTypes: Set<string>
	usesBlocks: boolean
	/**
	 * Slug -> emitted interface name, resolved once up front (same
	 * auto-derivation, `interfaceName` override, and content-hash collision
	 * suffix `blocksUnionSource` uses) so both the union *and* a restricted
	 * `blocks` field's narrowed per-field union reference the exact same
	 * names, hash-suffixed collision ones included, instead of each
	 * re-deriving (and drifting apart on).
	 */
	blockNames: Map<string, string>
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

/** Payload's `toWords(slug, true)`: split a block slug on `-`/`_`/whitespace and camelCase boundaries (`'content-block'` -> `['content', 'block']`, `'relatedPosts'` -> `['related', 'Posts']`). */
function slugWords(slug: string): string[] {
	return slug
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[-_\s]+/)
		.filter(Boolean)
}

/**
 * The auto-derived block interface name, Payload's rule: every block always
 * gets a top-level interface named as a PascalCase form of its slug
 * (`'content-block'` -> `ContentBlock`), `BlockConfig['interfaceName']`
 * (see `../collections/blocks/shared/types.ts`) is an override of that
 * auto-derivation, never the switch that enables generation.
 */
function toBlockInterfaceName(slug: string): string {
	return slugWords(slug)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('')
}

/**
 * The collision suffix for two *auto-derived* block names that resolve to
 * the same string but have different fields (e.g. two plugins each shipping
 * a `hero`): a short, deterministic hash of the block's own `fields`, so the
 * same schema always regenerates to the same name and only a field change
 * ever changes it, Payload's exact behavior (see its "Block interface name
 * collisions" docs). Keeps regenerations stable and surfaces the collision
 * as a type error at the import site instead of silently mistyping one of
 * the two shapes.
 */
function shortContentHash(input: string): string {
	let hash = 0
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 31 + input.charCodeAt(i)) >>> 0
	}
	return hash.toString(36).slice(0, 6)
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

/**
 * Mirrors `baseFieldSchema` (`fields/schema.ts`) field-type by field-type,
 * emitting a TS type source string per case instead of a zod call. Records
 * any external type it references into `state.usedTypes` (see
 * `EXTERNAL_TYPE_IMPORTS`) so the generated file's own import list stays
 * accurate. `indent` is the indentation the resulting type source is emitted
 * at (the property line's own leading tabs): only the `array` case consumes
 * it, threading it into `objectTypeSource` so a nested item object's braces
 * align with the property that owns it, not a hardcoded top-level depth
 * (the bug that misindented a nested `array` by one tab in generated files).
 */
function fieldTypeSource(
	field: LeafFieldConfig,
	state: GenState,
	indent: string
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
			state.usedTypes.add('BasiccnContent')
			return 'BasiccnContent'
		case 'checkbox':
		case 'switch':
			return 'boolean'
		case 'keywords':
			return 'string[]'
		case 'upload':
			state.usedTypes.add('UploadValue')
			return 'UploadValue'
		case 'array':
			return `${objectTypeSource(field.fields, state, indent)}[]`
		case 'relationship':
			state.usedTypes.add('RelationshipValue')
			return field.hasMany ? 'RelationshipValue[]' : 'RelationshipValue'
		case 'meta':
			state.usedTypes.add('MetaValue')
			return 'MetaValue'
		case 'relations':
			state.usedTypes.add('RelationsValue')
			return 'RelationsValue'
		case 'blocks': {
			state.usesBlocks = true
			// A restricted field (its own `blocks: [...]`,
			// `BlocksFieldConfig['blocks']`) references the union of just its
			// own blocks' named interfaces, not `ContentBlock`, so the
			// generated collection interface can't silently admit a block the
			// config banned. The names come from the shared `blockNames` map
			// (`GenState`), the same one `blocksUnionSource` emits the union
			// from, hash-suffixed collisions included. An unknown slug is a
			// config typo, not a valid type: throw at generation time, the
			// runtime `getBlocksSchema(slugs)` throws the same way at
			// validation. `blocks: []` (explicitly allow nothing) maps to
			// `never[]`, mirroring the runtime's `z.array(z.never())`.
			if (field.blocks) {
				if (field.blocks.length === 0) return 'never[]'
				const members: string[] = []
				for (const slug of field.blocks) {
					const name = state.blockNames.get(slug)
					if (!name) {
						throw new Error(
							`content-types-schema: blocks field '${field.name}' restricts to '${slug}', but that block is not registered. ` +
								`Registered: ${[...state.blockNames.keys()].join(', ') || '(none)'}`
						)
					}
					members.push(name)
				}
				return `(${members.join(' | ')})[]`
			}
			return 'ContentBlock[]'
		}
		case 'menu':
			state.usedTypes.add('NavMenuValue')
			return 'NavMenuValue'
		case 'links':
			state.usedTypes.add('LinkItemValue')
			return 'LinkItemValue[]'
	}
}

function buildTypeTree(
	fields: FieldConfig<any, any>[],
	state: GenState,
	indent: string
): TypeTree {
	const tree: TypeTree = {}
	for (const field of expandFields(fields)) {
		// Each dotted segment in `field.name` nests one object level deeper
		// in the emitted tree (`setTypePath` mirrors `treeToBodySource`'s
		// recursion), so the property line's indent is `indent` plus one tab
		// per segment: a top-level `links` array sits at `indent`, while one
		// under `hero` (a `hero.links` name) sits at `indent\t`. Handing every
		// field the same `indent` regardless of depth is what misindented a
		// nested `array` by one tab.
		const depth = (field.name.match(/\./g) ?? []).length
		setTypePath(tree, field.name, {
			typeSource: fieldTypeSource(
				field,
				state,
				`${indent}${'\t'.repeat(depth)}`
			),
			optional: !field.required
		})
	}
	return tree
}

/** An inline object type for one `array` field's own item shape, a fresh, self-contained tree with no outer dotted-path prefix carried in, mirroring `baseFieldSchema`'s own `case 'array': return z.array(fieldsToSchema(field.fields, resolvers))`. `indent` is the property line's own indentation: the item object's members sit one tab deeper and its closing brace aligns with the property that owns it, so a nested `array` stays correctly aligned at any depth. */
function objectTypeSource(
	fields: FieldConfig<any, any>[],
	state: GenState,
	indent: string
): string {
	const body = treeToBodySource(
		buildTypeTree(fields, state, `${indent}\t`),
		`${indent}\t`
	)
	return body ? `{\n${body}\n${indent}}` : '{}'
}

function entryInterfaceSource(
	entry: ContentTypeEntry,
	state: GenState
): string {
	const name = toInterfaceName(entry.slug)
	const fields = entry.isGlobal
		? (entry.fields ?? [])
		: flattenTabFields(entry.tabs ?? [])
	const body = treeToBodySource(buildTypeTree(fields, state, '\t'), '\t')
	return body
		? `export interface ${name} {\n${body}\n}`
		: `export interface ${name} {}`
}

/**
 * The module-level block types: one named, top-level `export interface` per
 * registered `blocksBySlug` entry (consumer and plugin blocks alike, the
 * same registry `getBlocksSchema()` reads at runtime), each carrying the
 * block's own `fields` tree plus `blockType: '<slug>'` as its literal
 * discriminant and Payload's optional `blockName`, then one `ContentBlock`
 * union combining those names. Payload parity
 * (https://payloadcms.com/docs/typescript/generating-types): every block
 * always gets a top-level interface, auto-named as a PascalCase form of the
 * slug, `interfaceName` on the block config is an override; two blocks that
 * collide on an auto-derived name keep the first name clean and suffix the
 * later one with a short content hash. The names come from the shared
 * `state.blockNames` map (`GenState`), resolved once up front in
 * `buildContentTypesSource` so a restricted `blocks` field's narrowed union
 * references identical names. Emitted whenever the run hit a `blocks` field
 * (`state.usesBlocks`) *or* any block is registered: the augmentation's
 * `GeneratedBlockTypes` (which powers `GeneratedBlockSlug` autocomplete)
 * references these interfaces, so they must exist whenever one does.
 */
function blocksUnionSource(state: GenState): string {
	const blockEntries = Object.values(blocksBySlug)
	if (blockEntries.length === 0) return 'export type ContentBlock = never'

	const interfaces: string[] = []
	const unionMembers: string[] = []

	for (const block of blockEntries) {
		const name =
			state.blockNames.get(block.slug) ?? toBlockInterfaceName(block.slug)

		const body = treeToBodySource(
			buildTypeTree(block.fields, state, '\t\t'),
			'\t\t'
		)
		const lines = [
			`export interface ${name} {`,
			`\t\tblockType: '${block.slug}'`,
			// Payload's `blockName`, the optional per-instance label (see
			// `BlockConfig['disableBlockName']`, `../collections/blocks/shared/types.ts`),
			// present on every interface even though `defineBlock` only ever
			// injects it into a schema at runtime.
			'\t\tblockName?: string'
		]
		if (body) lines.push(body)
		lines.push('}')
		interfaces.push(lines.join('\n'))
		unionMembers.push(`\t| ${name}`)
	}

	return [
		interfaces.join('\n\n'),
		`export type ContentBlock =\n${unionMembers.join('\n')}`
	].join('\n\n')
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
	const blockEntries = Object.values(blocksBySlug)

	// Resolve every registered block's interface name once, up front, so both
	// the `ContentBlock` union and any restricted `blocks` field's narrowed
	// union reference the same names. Same collision rule as before: only
	// *auto-derived* collisions get the content-hash suffix, an explicit
	// `interfaceName` is used verbatim (the consumer's own job to keep
	// unique, Payload's rule).
	const blockNames = new Map<string, string>()
	{
		const usedNames = new Set<string>()
		for (const block of blockEntries) {
			let name = block.interfaceName ?? toBlockInterfaceName(block.slug)
			if (!block.interfaceName && usedNames.has(name)) {
				name = `${name}${shortContentHash(JSON.stringify(block.fields))}`
			}
			usedNames.add(name)
			blockNames.set(block.slug, name)
		}
	}

	const state: GenState = {
		usedTypes: new Set(),
		usesBlocks: false,
		blockNames
	}
	const interfaces = entries.map((entry) => entryInterfaceSource(entry, state))

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

	// The blocks union has to be built *before* the import list below: its
	// members reference the same external types collection/global fields do
	// (a `links` field inside a `cta` member pulls in `LinkItemValue`), so
	// the import block must be computed after it, or those types go missing
	// from the generated file's imports. Emitted when the run hit a `blocks`
	// field *or* any block is registered: the augmentation's
	// `GeneratedBlockTypes` references these interfaces, so they must exist
	// whenever one is emitted.
	const emitBlocks = state.usesBlocks || blockEntries.length > 0
	const blocksUnion = emitBlocks ? blocksUnionSource(state) : ''

	const importsByModule = new Map<string, string[]>()
	for (const typeName of state.usedTypes) {
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

	const blockMapBody = blockEntries
		.map(
			(entry) => `\t\t${propertyKey(entry.slug)}: ${blockNames.get(entry.slug)}`
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
		// Slug-keyed to each block's own named interface (see
		// `blocksUnionSource`), so `GeneratedBlockSlug` (`base.types.ts`)
		// autocompletes a `blocks` field's own `blocks: [...]` restriction
		// list against exactly the slugs this consumer registered. Emitted
		// even when no field restricts (or uses) blocks, empty interface when
		// nothing is registered, so the fallback keeps a plain `string`.
		'\tinterface GeneratedBlockTypes {',
		blockMapBody,
		'\t}',
		'}'
	].join('\n')

	return (
		[
			'// AUTO-GENERATED by `bun x base`: do not hand-edit.',
			importsBlock,
			interfaces.join('\n\n'),
			blocksUnion,
			augmentationBlock
		]
			.filter((block) => block !== '')
			.join('\n\n') + '\n'
	)
}
