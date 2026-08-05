import type { TypedDocumentRow } from "@baseconfig/core"

// Single document
export type DocumentProps = TypedDocumentRow<"docs">

// Document + children
export type DocumentNode = DocumentProps & {
    children: DocumentNode[]
}

export function buildDocTree(docs: DocumentProps[]): DocumentNode[] {
    const map = new Map<string, DocumentNode>()
    const roots: DocumentNode[] = []

    // First pass: create nodes
    docs.forEach((doc) => {
        map.set(doc.id, { ...doc, children: [] })
    })

    // Second pass: attach children
    docs.forEach((doc) => {
        const node = map.get(doc.id)!

        // parent is an ID string (or null/undefined)
        if (doc.data.parent && map.has(doc.data.parent)) {
            map.get(doc.data.parent)!.children.push(node)
        } else {
            roots.push(node)
        }
    })

    // Sort by order (optional)
    const sortByOrder = (nodes: DocumentNode[]) => {
        nodes.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))
        nodes.forEach((n) => sortByOrder(n.children))
    }
    sortByOrder(roots)

    return roots
}