import type { TypedDocumentRow, TypedGlobalRow } from "@baseconfig/core"

export type CategoryItem = NonNullable<
    NonNullable<TypedGlobalRow<"category">["data"]>["category"]
>[number]

export type DocumentProps = TypedDocumentRow<"docs">

export type DocumentNode = DocumentProps & {
    children: DocumentNode[]
    isCategory?: boolean
}

function formatCategoryTitle(str: string): string {
    const text = str.replace(/[-_]/g, " ").trim()
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
            order: cat.order ?? index,
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
                        title: meta?.label ?? formatCategoryTitle(rawCat),
                        slug: null as any,
                        status: 'published',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        isCategory: true,
                        data: { order: meta?.order ?? 99 } as any,
                        children: [],
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