import { useAppForm } from '@base/ui/forms'
import { useLiveQuery } from '@tanstack/react-db'
import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import type { z } from 'zod'
import type { ContentCollection, DraftCollection } from './collections'

type UseDocumentOptions<TData extends Record<string, unknown>> = {
	collection: ContentCollection
	draftCollection: DraftCollection
	id: string
	schema: z.ZodTypeAny
	defaultValues: () => TData
}

/**
 * **Real local-first: a document's draft lives in the browser's own
 * `localStorage` (`draftCollection`, `localStorageCollectionOptions` — see
 * `db/collections.ts`'s `draftCollections`/`draftGlobalsCollection`), not
 * just in-memory form state.** Every field edit writes straight through to
 * that draft — free, since it's a local write with zero backend
 * involvement — so a draft survives a reload with no explicit "Save" step
 * at all; the browser *is* the save. The **only** thing that ever touches
 * the real `/api/<collection>` backend is `publish()`, and it only ever
 * runs when a caller explicitly invokes it (a "Publish"/"Unpublish"/
 * "Commit & push" button click) — never a side effect of typing, opening a
 * document, or navigating away.
 *
 * Two earlier versions of this hook got "local-first" wrong in different
 * ways: (a) debounced a real `collection.update()` call 500ms after every
 * keystroke, and (b) deferred that same real call until an explicit save
 * click, but still called it for every save, not just a publish — both
 * were real backend writes gated only by *timing*, not by whether the
 * write was actually meant to go live. This version is the first where
 * editing is never a backend call at all — confirmed by request count: an
 * open-and-edit session with no Publish click produces zero network
 * requests from this hook, period.
 *
 * When `id` has no local draft yet, one is seeded automatically on mount
 * from the remote row's data (or `defaultValues()` for a brand-new
 * document) — this *is* fine to do automatically, unlike a remote insert,
 * because it's a pure `localStorage` write. `publish()` decides insert vs.
 * update against the *remote* collection by whether a real row exists at
 * call time, not by a flag a caller has to pass in.
 *
 * **Caller precondition**: don't mount a component that calls this hook
 * until both `collection` and `draftCollection`'s own `useLiveQuery(...).isReady`
 * are true (`CollectionForm`/`GlobalForm` gate on exactly this before
 * rendering the component that actually calls `useDocument`). `useAppForm`
 * only snapshots `defaultValues` once, at first render — mounting before
 * either query has resolved would freeze the form at empty/default values
 * that then never get replaced once real data arrives.
 */
export function useDocument<TData extends Record<string, unknown>>({
	collection,
	draftCollection,
	id,
	schema,
	defaultValues
}: UseDocumentOptions<TData>) {
	const { data: remoteData } = useLiveQuery(collection)
	const remoteRow = remoteData.find((r) => r.id === id)

	const { data: draftData } = useLiveQuery(draftCollection)
	const draftRow = draftData.find((r) => r.id === id)

	// Seeds the local draft the first time this document is opened. Checked
	// via `draftCollection.get(id)` directly rather than `draftRow` (derived
	// from `useLiveQuery`'s own snapshot) so a StrictMode/HMR double-run of
	// this effect can't insert the same id twice — the exact failure mode
	// that broke an earlier version of this hook's remote auto-create.
	useEffect(() => {
		if (draftCollection.get(id)) return
		const now = new Date().toISOString()
		draftCollection.insert({
			id,
			data: ((remoteRow?.data as TData | undefined) ??
				defaultValues()) as Record<string, unknown>,
			status: remoteRow?.status ?? 'draft',
			createdAt: remoteRow?.createdAt ?? now,
			updatedAt: remoteRow?.updatedAt ?? now
		})
		// Only re-seeds when the document identity changes — `remoteRow`/
		// `defaultValues` are read for their value at that moment, not
		// tracked as reactive dependencies (re-seeding on every remote
		// refresh would clobber local edits with server data).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, draftCollection])

	const initialValue = (draftRow?.data ??
		remoteRow?.data ??
		defaultValues()) as TData

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

	// Write-through: every change to the form's in-memory values is mirrored
	// into the local draft — no debounce, since a `localStorage` write is
	// free. Skipped until the seeding effect above has actually run.
	useEffect(() => {
		if (!draftCollection.get(id)) return
		draftCollection.update(id, (draft) => {
			draft.data = store as Record<string, unknown>
			draft.updatedAt = new Date().toISOString()
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, draftCollection, store])

	/**
	 * The one and only place this hook touches the network. Reads the
	 * draft's current data and writes it to the *remote* collection —
	 * insert if no remote row exists yet, update otherwise.
	 * `statusOverride` lets a caller change `status` in the same write as
	 * the data (e.g. "Publish" = the current draft *and* `published` in one
	 * request, not two). Returns the underlying transaction so a caller can
	 * `await result?.isPersisted.promise` to know whether the mutation
	 * actually succeeded.
	 */
	const publish = (statusOverride?: 'draft' | 'published') => {
		const pending = (draftCollection.get(id)?.data ?? store) as Record<
			string,
			unknown
		>

		if (!remoteRow) {
			const now = new Date().toISOString()
			return collection.insert({
				id,
				data: pending as any,
				status: statusOverride ?? 'draft',
				createdAt: now,
				updatedAt: now
			} as any)
		}

		return collection.update(id, (draft) => {
			draft.data = pending as any
			draft.updatedAt = new Date().toISOString()
			if (statusOverride) draft.status = statusOverride
		})
	}

	// "Dirty" means "the draft differs from what's actually live" — there's
	// no separate saved/unsaved draft state to track anymore (the draft is
	// always saved, to `localStorage`); this is what gates the
	// Publish/Commit button instead. A brand-new document (no `remoteRow`)
	// is always dirty — nothing is live yet.
	const isDirty =
		!remoteRow || JSON.stringify(store) !== JSON.stringify(remoteRow.data)

	const row =
		remoteRow ??
		({
			id,
			data: initialValue,
			status: 'draft' as const,
			createdAt: draftRow?.createdAt ?? new Date().toISOString(),
			updatedAt: draftRow?.updatedAt ?? new Date().toISOString()
		} as const)

	return { form, row, publish, isDirty }
}
