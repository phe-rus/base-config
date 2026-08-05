/**
 * Reconciles a document/global's stored `data` against a collection/global's
 * *current* real field paths (`fields/schema.ts`'s `knownFieldPaths`),
 * dropping anything that no longer corresponds to a field in the present
 * config. Exists because content persistence is one opaque `data` JSON blob
 * with no per-field SQL column (see `content-queries.ts`'s own doc comment)
 * and every write merges rather than replaces (`{...existing.data,
 * ...fields}`): renaming or removing a field leaves its old value orphaned
 * in the blob forever, invisible to the current schema/generated types but
 * still physically stored, until something explicitly prunes it. Used both
 * server-side (`pruneDocument`/`pruneGlobal`, `content-queries.ts`, a
 * deliberate full-replace write, the one place this package ever replaces
 * `data` outright instead of merging into it) and client-side
 * (`db/use-document.ts`, reconciling a local draft the moment a document is
 * opened, so an editor never shows or keeps re-saving a field that's no
 * longer part of the schema).
 *
 * **v1 scope: top-level and nested-group fields only.** A known path like
 * `'product.price'` reconciles the nested `product` object's own keys; a
 * known path like `'seo'` (a `meta`-type field, itself a leaf per
 * `knownFieldPaths`' own doc comment) keeps whatever's stored there
 * wholesale, this never recurses into an `array`/`blocks`/
 * `menu`/`links` field's own item shape. Deliberate, not an oversight, see
 * `knownFieldPaths`.
 */
type PathTree = { [key: string]: PathTree | true }

function buildPathTree(paths: string[]): PathTree {
	const tree: PathTree = {}
	for (const path of paths) {
		const parts = path.split('.')
		let node = tree
		for (let i = 0; i < parts.length - 1; i++) {
			const key = parts[i]
			const existing = node[key]
			if (!existing || existing === true) node[key] = {}
			node = node[key] as PathTree
		}
		node[parts[parts.length - 1]] = true
	}
	return tree
}

function pruneByTree(
	data: Record<string, unknown>,
	tree: PathTree
): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const [key, node] of Object.entries(tree)) {
		if (!(key in data)) continue
		const value = data[key]
		if (node === true) {
			result[key] = value
		} else if (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			result[key] = pruneByTree(value as Record<string, unknown>, node)
		}
		// A known path expects a nested group but the stored value isn't a
		// plain object (e.g. `null`/an array/a primitive, most likely a stale
		// shape from before this same key became a group): dropped rather
		// than passed through, a known path never describes anything other
		// than a leaf or a plain nested object.
	}
	return result
}

/**
 * Prunes `data` down to only what `knownPaths` (see `knownFieldPaths`)
 * actually reaches. Pure, no I/O: safe to call both server-side (against a
 * row freshly read from D1) and client-side (against a local draft), same
 * function, same behavior either way.
 */
export function pruneDataToKnownPaths(
	data: Record<string, unknown>,
	knownPaths: string[]
): Record<string, unknown> {
	return pruneByTree(data, buildPathTree(knownPaths))
}
