import { useAppForm } from '@base/ui/forms'
import { useLiveQuery } from '@tanstack/react-db'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import type { z } from 'zod'
import type { ContentCollection } from './collections'

type UseDocumentOptions<TData extends Record<string, unknown>> = {
	collection: ContentCollection
	id: string
	schema: z.ZodTypeAny
	defaultValues: () => TData
	autoCreate?: boolean
}

/**
 * **Local-first, on purpose — this is the whole point of backing every
 * collection with a `tanstack-db` collection instead of calling the API
 * directly.** Editing a field only ever updates `form.store`, plain React
 * state with zero network involvement; nothing here debounces, auto-saves,
 * or flushes on unmount. The *only* thing that ever calls
 * `collection.update()` (and therefore the real `/api/<collection>` PATCH,
 * a real D1 write) is `save()`, and `save()` only ever runs when a caller
 * explicitly invokes it — a "Save draft"/"Publish" button click, never a
 * side effect of typing or navigating away.
 *
 * An earlier version of this hook debounced a `collection.update()` call
 * 500ms after every keystroke, for every collection — meaning a real
 * database write on every pause while typing, for a draft that was never
 * even published. That's the opposite of local-first, and at any real
 * traffic volume it's a real cost problem, not just an architectural
 * nicety. `auth: true` collections (`createRealUser`/`onUpdate` in
 * `db/collections.ts`) were already manual-save-only for a related reason
 * (an API call on every keystroke against a rate-limited endpoint); this
 * makes manual-save-only the *only* mode, for every collection, not a
 * special case.
 *
 * **Known, disclosed trade-off**: since there's no debounce/unmount-flush
 * anymore, closing the tab or navigating away without clicking Save loses
 * unsaved edits — same as any form that isn't auto-saved. True local-first
 * *persistence* (edits surviving a reload before ever being saved, via an
 * IndexedDB-backed collection or similar) is a separate, larger feature
 * this doesn't attempt — `form.store` is in-memory React state, not
 * persisted storage.
 */
export function useDocument<TData extends Record<string, unknown>>({
	collection,
	id,
	schema,
	defaultValues,
	autoCreate = false
}: UseDocumentOptions<TData>) {
	const { data } = useLiveQuery(collection)
	const row = data.find((r) => r.id === id)

	useEffect(() => {
		if (row || !autoCreate) return
		const now = new Date().toISOString()
		collection.insert({
			id,
			data: defaultValues(),
			status: 'draft',
			createdAt: now,
			updatedAt: now
		} as any)
	}, [row, autoCreate, id])

	const [initialValue] = useState<TData>(
		() => (row?.data as TData | undefined) ?? defaultValues()
	)

	const form = useAppForm({
		defaultValues: initialValue,
		validators: {
			onChange: schema as any,
			onMount: schema as any,
			onSubmit: schema as any
		},
		onSubmit: () => {}
	})

	const store = useSelector(form.store, (s) => s.values) as TData
	// Tracks the last value actually persisted via `save()` — state, not a
	// ref, specifically so a save re-renders: `isDirty` needs to flip back
	// to `false` right after a successful save, not just after the user's
	// next edit.
	const [lastSaved, setLastSaved] = useState<TData>(initialValue)

	/**
	 * The one and only place this hook touches the network. `statusOverride`
	 * lets a caller change `status` in the same write as the data (e.g.
	 * "Publish" = save the current form values *and* flip to `published` in
	 * one request, not two separate writes). Returns the underlying
	 * transaction so a caller can `await result?.isPersisted.promise` to
	 * know whether the mutation actually succeeded.
	 */
	const save = (statusOverride?: 'draft' | 'published') => {
		const pending = store
		setLastSaved(pending)
		return collection.update(id, (draft) => {
			draft.data = pending as any
			draft.updatedAt = new Date().toISOString()
			if (statusOverride) draft.status = statusOverride
		})
	}

	// JSON comparison, not a deep-equal library — form data here is always
	// plain JSON-serializable values (this is what ends up persisted), so
	// this is exact and needs no new dependency.
	const isDirty = JSON.stringify(store) !== JSON.stringify(lastSaved)

	return { form, row, save, isDirty }
}
