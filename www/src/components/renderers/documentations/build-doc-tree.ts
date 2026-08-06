import type { TypedDocumentRow, TypedGlobalRow } from '@baseconfig/core'

export type CategoryItem = NonNullable<
	NonNullable<TypedGlobalRow<'category'>['data']>['category']
>[number]

export type DocumentProps = TypedDocumentRow<'docs'>

export type DocumentNode = DocumentProps & {
	children: DocumentNode[]
	isCategory?: boolean
}

function formatCategoryTitle(str: string): string {
	const text = str.replace(/[-_]/g, ' ').trim()
	if (!text) return str
	return text.charAt(0).toUpperCase() + text.slice(1)
}

export function buildDocTree(
	docs: DocumentProps[],
	categories: CategoryItem[] = []
): DocumentNode[] {
	const docMap = new Map<string, DocumentNode>()
	const categoryMap = new Map<string, DocumentNode>()
	const roots: DocumentNode[] = []
	const categoryMeta = new Map<string, { label: string; order: number }>()
	categories.forEach((cat, index) => {
		if (!cat?.label) return
		const key = cat.label.toLowerCase().trim()
		categoryMeta.set(key, {
			label: cat.label,
			order: cat.order ?? index
		})
	})

	docs.forEach((doc) => {
		docMap.set(doc.id, { ...doc, children: [] })
	})
	docs.forEach((doc) => {
		const node = docMap.get(doc.id)!
		const cats = (doc.data?.category as string[] | undefined) ?? []
		const parentId = doc.data?.parent as string | undefined
		if (cats.length > 0) {
			cats.forEach((rawCat) => {
				const key = rawCat.trim().toLowerCase()
				if (!key) return

				if (!categoryMap.has(key)) {
					const meta = categoryMeta.get(key)

					const catNode: DocumentNode = {
						id: `cat-${key}`,
						title: formatCategoryTitle(meta?.label ?? rawCat),
						slug: null as any,
						status: 'published',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						isCategory: true,
						data: { order: meta?.order ?? 99 } as any,
						children: []
					}

					categoryMap.set(key, catNode)
					roots.push(catNode)
				}

				categoryMap.get(key)!.children.push(node)
			})
			return
		}
		if (parentId && docMap.has(parentId)) {
			docMap.get(parentId)!.children.push(node)
			return
		}
		roots.push(node)
	})
	const sortByOrder = (nodes: DocumentNode[]) => {
		nodes.sort((a, b) => {
			const orderA = a.isCategory ? (a.data?.order ?? 99) : (a.data?.order ?? 0)
			const orderB = b.isCategory ? (b.data?.order ?? 99) : (b.data?.order ?? 0)
			return orderA - orderB
		})
		nodes.forEach((n) => sortByOrder(n.children))
	}
	sortByOrder(roots)
	return roots
}
export function getFirstDoc(nodes: DocumentNode[]): DocumentNode | undefined {
	for (const node of nodes) {
		if (!node.isCategory && node.slug) return node
		if (node.children.length) {
			const found = getFirstDoc(node.children)
			if (found) return found
		}
	}
	return undefined
}

/**
 * The linear reading order prev/next navigation walks, same pre-order
 * traversal `RenderNav` itself renders in (a node, then its own children,
 * before moving to the next sibling), just flattened into one list with
 * category nodes themselves omitted, only real docs are something you can
 * navigate to.
 */
export function flattenDocTree(nodes: DocumentNode[]): DocumentNode[] {
	const out: DocumentNode[] = []
	for (const node of nodes) {
		if (!node.isCategory && node.slug) out.push(node)
		if (node.children.length) out.push(...flattenDocTree(node.children))
	}
	return out
}

/**
 * The doc a `?slug=` search param (or its absence) actually resolves to:
 * no slug falls back to the tree's own first real doc (`getFirstDoc`), a
 * slug matching no doc directly falls back to treating it as a parent's own
 * slug (`'fields/text'` with no such doc resolves to the `'fields'` doc),
 * matching a category page falling through to its first child. Shared by
 * the docs route's `loader` (so `head()` can build real per-doc metadata
 * before the component ever mounts) and the component's own render, so the
 * two can never drift on which doc "active" actually means.
 */
export function resolveActiveDoc(
	docs: DocumentProps[],
	tree: DocumentNode[],
	slug: string | undefined
): DocumentProps | undefined {
	if (!slug) return getFirstDoc(tree) ?? docs[0]
	const match = docs.find((doc) => doc.slug === slug)
	if (match) return match
	const parentSlug = slug.split('/')[0]
	return docs.find((doc) => doc.slug === parentSlug)
}

/**
 * Whether `slug` appears anywhere under `nodes`, used by `RenderNav` to
 * decide a category's own default open/closed state: a category containing
 * whatever doc you're currently reading should start expanded, every other
 * category starts collapsed, so the nav stays compact (now that there are
 * six categories and 20+ field docs) without hiding your own location in it.
 */
export function docTreeContainsSlug(
	nodes: DocumentNode[],
	slug: string | undefined
): boolean {
	if (!slug) return false
	for (const node of nodes) {
		if (!node.isCategory && node.slug === slug) return true
		if (node.children.length && docTreeContainsSlug(node.children, slug)) {
			return true
		}
	}
	return false
}
