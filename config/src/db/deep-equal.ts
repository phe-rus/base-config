/**
 * A structural, order-independent equality check for two JSON-shaped
 * values: a document/global's own `data` is always exactly this (whatever
 * survives a round trip through `JSON.stringify`/`JSON.parse`, since it's
 * stored as a `text('data', {mode: 'json'})` column, never a `Date`/`Map`/
 * `Set`/etc.), so this never needs to handle anything beyond plain
 * objects, arrays, and primitives.
 *
 * Replaces three separate, subtly broken comparisons that all shared the
 * same underlying mistake:
 *
 * - `useDocument`'s own `isDirty` and `publishKeywordPool`'s remote-vs-draft
 *   check both used `JSON.stringify(a) === JSON.stringify(b)`, which is
 *   sensitive to object key *order*, not just content. A document's own
 *   key order almost never matches between the server's stored blob and
 *   the client's reconstructed value (different sources, different
 *   construction paths), even when every field's actual value is
 *   identical, so both checks routinely reported "changed" when nothing
 *   had changed at all.
 * - The content/globals collections' own `onUpdate` diffing used
 *   `Object.is()` per field to decide what actually changed, which
 *   compares object/array-valued fields *by reference*. `mutation.modified`
 *   (the client's own reconstructed draft/form data) and
 *   `mutation.original` (the last server-fetched row) are two
 *   independently-sourced object graphs that were never the same
 *   reference to begin with, so every composite field (`blocks`, `meta`,
 *   `array`, `relations`, `menu`, `keywords`, ...) was *always* included in
 *   the diff sent to the server, regardless of whether it actually
 *   changed; only primitive-valued fields (strings/numbers/booleans)
 *   genuinely benefited from the diffing.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true
	if (a === null || b === null) return false
	if (typeof a !== 'object' || typeof b !== 'object') return false

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b)) return false
		if (a.length !== b.length) return false
		return a.every((value, index) => deepEqual(value, b[index]))
	}

	const aObj = a as Record<string, unknown>
	const bObj = b as Record<string, unknown>
	const aKeys = Object.keys(aObj)
	const bKeys = Object.keys(bObj)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every(
		(key) =>
			Object.prototype.hasOwnProperty.call(bObj, key) &&
			deepEqual(aObj[key], bObj[key])
	)
}
