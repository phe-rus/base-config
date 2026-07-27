import { useAppForm } from '@pherus/utilities/forms'
import { useLiveQuery } from '@tanstack/react-db'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
import type { ContentCollection } from './collections'

type UseDocumentOptions<TData extends Record<string, unknown>> = {
	collection: ContentCollection
	id: string
	schema: z.ZodTypeAny
	defaultValues: () => TData
	autoCreate?: boolean
	/**
	 * Debounced (500ms) auto-save on every change — default `true`. Set
	 * `false` for a real backend collection (`auth: true`) where every
	 * keystroke shouldn't become an API call against a rate-limited
	 * endpoint; the caller gets `save()` back to persist explicitly instead
	 * (e.g. a "Commit" button `CollectionForm` renders for those).
	 */
	autoSave?: boolean
}

export function useDocument<TData extends Record<string, unknown>>({
	collection,
	id,
	schema,
	defaultValues,
	autoCreate = false,
	autoSave = true
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
	// Tracks the last value actually persisted (auto-save flush or manual
	// `save()`) — state, not a ref, specifically so a save re-renders:
	// `isDirty` needs to flip back to `false` right after a successful save,
	// not just after the user's next edit.
	const [lastSaved, setLastSaved] = useState<TData>(initialValue)
	const pendingRef = useRef<TData | null>(null)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const flush = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		const pending = pendingRef.current
		if (!pending) return undefined
		pendingRef.current = null
		setLastSaved(pending)
		return collection.update(id, (draft) => {
			draft.data = pending as any
			draft.updatedAt = new Date().toISOString()
		})
	}

	useEffect(() => {
		if (!autoSave) return
		pendingRef.current = store
		timeoutRef.current = setTimeout(flush, 500)
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [store, autoSave])

	useEffect(() => {
		if (!autoSave) return
		return () => {
			flush()
		}
	}, [autoSave])

	/**
	 * Persists the form's current values immediately — the manual
	 * counterpart to the debounced auto-save, used when `autoSave` is
	 * `false`. Returns the underlying transaction so a caller can
	 * `await result?.isPersisted.promise` to know whether the mutation
	 * actually succeeded (it rejects with whatever `onUpdate` threw).
	 */
	const save = () => {
		pendingRef.current = store
		return flush()
	}

	// JSON comparison, not a deep-equal library — form data here is always
	// plain JSON-serializable values (this is what ends up persisted), so
	// this is exact and needs no new dependency.
	const isDirty = JSON.stringify(store) !== JSON.stringify(lastSaved)

	return { form, row, save, isDirty }
}
