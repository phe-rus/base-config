import type { EditorView } from '@tiptap/pm/view'

/**
 * Resolve a storage-relative `/api/cdn/...` URL to an absolute one so the
 * `src` persisted in a rich text document never depends on the origin it was
 * authored under. Data URLs and already-absolute URLs pass through untouched.
 */
export function toAbsoluteUrl(url: string): string {
	if (!url.startsWith('/')) return url
	return new URL(url, window.location.origin).toString()
}

/** The single base64 reader every image ingestion path falls back to when no storage upload is available (or it fails). */
export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

/**
 * Upload an image to media storage, falling back to an embedded base64 data
 * URL when no upload callback is injected or the upload itself fails. The
 * fallback keeps the editor usable (offline, unauthenticated, standalone)
 * without ever letting a stored base64 image break the wired path.
 */
export async function resolveImageUrl(
	file: File,
	onUpload?: (file: File) => Promise<string>
): Promise<string> {
	if (!onUpload) return readFileAsDataUrl(file)
	try {
		return toAbsoluteUrl(await onUpload(file))
	} catch {
		return readFileAsDataUrl(file)
	}
}

/** Convert an embedded `data:image/...` URL into a real `File` so a pasted base64 image can go through the normal upload path. */
export async function dataUrlToFile(dataUrl: string): Promise<File> {
	const response = await fetch(dataUrl)
	const blob = await response.blob()
	const type = blob.type || 'image/png'
	const extension = type.split('/')[1] ?? 'png'
	return new File([blob], `image.${extension}`, { type })
}

/**
 * Upload a pasted/dropped image and insert an `image` node at `pos`. The
 * position is captured before the async work so the node lands where the
 * user pasted or dropped, not wherever the selection later moved to.
 */
export async function insertImageFile(
	view: EditorView,
	pos: number,
	file: File,
	onUpload?: (file: File) => Promise<string>
): Promise<void> {
	const url = await resolveImageUrl(file, onUpload)
	const node = view.state.schema.nodes.image.create({
		src: url,
		alt: file.name
	})
	view.dispatch(view.state.tr.insert(pos, node))
}

/**
 * Paste handler: a clipboard image (`image/*` file or an HTML `data:image`
 * src) is uploaded and inserted as a CDN-backed image node; anything else
 * (real URLs, plain text) returns `false` so Tiptap pastes it untouched.
 */
export function handleImagePaste(
	view: EditorView,
	event: ClipboardEvent,
	onUpload?: (file: File) => Promise<string>
): boolean {
	const items = event.clipboardData?.items
	let file: File | null | undefined
	if (items) {
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				file = item.getAsFile()
				break
			}
		}
	}
	if (!file && event.clipboardData?.files?.length) {
		file = event.clipboardData.files[0]
	}
	if (file) {
		const pos = view.state.selection.from
		void insertImageFile(view, pos, file, onUpload)
		return true
	}
	const html = event.clipboardData?.getData('text/html')
	if (html) {
		const match = /src="(data:image\/[^"]+)"/i.exec(html)
		if (match) {
			const pos = view.state.selection.from
			void dataUrlToFile(match[1]).then((converted) =>
				insertImageFile(view, pos, converted, onUpload)
			)
			return true
		}
	}
	return false
}

/** Drop handler: an image dropped anywhere in the document is uploaded and inserted under the cursor; anything else falls through to ProseMirror. */
export function handleImageDrop(
	view: EditorView,
	event: DragEvent,
	onUpload?: (file: File) => Promise<string>
): boolean {
	const file = event.dataTransfer?.files?.[0]
	if (!file || !file.type.startsWith('image/')) return false
	const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
	if (!coords) return false
	void insertImageFile(view, coords.pos, file, onUpload)
	return true
}
