import { contentCollections } from '../../../db/collections'
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor
} from '@baseconfig/ui/components/combobox'
import { FieldShell, useFieldState } from '@baseconfig/ui/forms'
import { useLiveQuery } from '@tanstack/react-db'
import { useMemo, useState } from 'react'
import { collectionsBySlug } from '../../registry'
import type { CollectionSlug } from '../../types'

/**
 * The field's stored value, Payload's own relationship value model
 * (`fields/schema.ts`'s `relationshipValueSchema`): a bare document id for a
 * single-`relationTo` field, `{relationTo, value}` for a polymorphic (array
 * `relationTo`) one, `hasMany` wraps whichever applies in an array. Labels
 * are never stored, they're re-derived at render time from the live options.
 */
type RelationshipStored = string | { relationTo: string; value: string }

/** The id of a stored value regardless of which shape it took. */
function valueId(value: RelationshipStored): string {
	return typeof value === 'string' ? value : value.value
}

/**
 * The full pick handed to `onValueChange`: the id the field stores plus the
 * label/slug/collection details that a bare id can't carry, so a caller can
 * derive a sibling value (e.g. a nav link's `to` from the picked document's
 * slug) without a live lookup.
 */
export type RelationshipSelection = {
	id: string
	slug: string
	title: string
	collection: CollectionSlug
	relationTo: CollectionSlug
}

type RelationshipFieldProps = {
	label?: string
	description?: string
	/** Restrict the picker to one or more collections, omit to search every collection, including the one this field itself lives in (self-references are allowed). */
	targetType?: CollectionSlug | CollectionSlug[]
	/** Exclude the document currently being edited from its own picker. */
	excludeId?: string
	/** Allow picking more than one document instead of only one. */
	hasMany?: boolean
	/** Only meaningful with `hasMany`, fewest/most documents allowed. Enforced schema-side, the picker also stops offering new picks once `maxRows` is reached. */
	minRows?: number
	maxRows?: number
	/** Single-select only, called alongside the field's own `handleChange`, e.g. to sync a sibling field (a nav link's `to` derived from the picked document's slug). */
	onValueChange?: (value: RelationshipSelection | undefined) => void
}

type Option = {
	label: string
	value: string
	slug: string
	collection: CollectionSlug
}

/**
 * A sentinel slug that's never a real registered collection, `getContentCollection`
 * (`../../../db/collections.ts`) resolves any unregistered slug to a shared,
 * always-empty stand-in, so a `useLiveQuery` slot below with nothing real to
 * query still gets a valid, empty collection rather than `undefined`.
 */
const UNUSED_TARGET_SLOT = '__unused_relationship_target__'

/** How many collections one `RelationshipField` can search at once, see `useRelationshipOptions`'s own doc comment for why this is a fixed number. Raise it (and add one more `useLiveQuery(...)` slot below) if a real field ever needs more simultaneous targets. */
const MAX_RELATIONSHIP_TARGETS = 8

/**
 * Every targeted collection's live data, queried through a fixed number of
 * `useLiveQuery` "slots": React's rules of hooks mean this can't loop
 * `useLiveQuery` over a runtime-length list directly, so instead each slot
 * always calls the hook, just against whichever real `targets[i]` names (or
 * the shared empty stand-in once `targets` runs out). This is what makes
 * `targetType`/a field's own `relationTo` genuinely dynamic, not restricted
 * to a hardcoded few collection names, up to `MAX_RELATIONSHIP_TARGETS` at
 * once. Omitting `targetType` searches every collection this app has
 * registered (minus `users`, see below), not a fixed subset.
 */
function useRelationshipOptions(
	targetType: CollectionSlug | CollectionSlug[] | undefined,
	excludeId: string | undefined
): Option[] {
	const targets = useMemo<CollectionSlug[]>(() => {
		if (targetType) return Array.isArray(targetType) ? targetType : [targetType]
		// `users` is deliberately excluded: real accounts aren't a relatable
		// content type, and (being server-backed, not `localStorage`) aren't
		// queried here at all. See `CollectionConfig['auth']`. A plugin's own
		// collections (e.g. `@baseconfig/plugin-form-builder`'s `forms`) are
		// included here for free now, since this reads the real registry
		// rather than a hardcoded list.
		return Object.values(collectionsBySlug)
			.filter((collection) => !collection.auth)
			.map((collection) => collection.slug)
	}, [targetType])

	const slot0 = useLiveQuery(
		contentCollections[targets[0] ?? UNUSED_TARGET_SLOT]
	).data
	const slot1 = useLiveQuery(
		contentCollections[targets[1] ?? UNUSED_TARGET_SLOT]
	).data
	const slot2 = useLiveQuery(
		contentCollections[targets[2] ?? UNUSED_TARGET_SLOT]
	).data
	const slot3 = useLiveQuery(
		contentCollections[targets[3] ?? UNUSED_TARGET_SLOT]
	).data
	const slot4 = useLiveQuery(
		contentCollections[targets[4] ?? UNUSED_TARGET_SLOT]
	).data
	const slot5 = useLiveQuery(
		contentCollections[targets[5] ?? UNUSED_TARGET_SLOT]
	).data
	const slot6 = useLiveQuery(
		contentCollections[targets[6] ?? UNUSED_TARGET_SLOT]
	).data
	const slot7 = useLiveQuery(
		contentCollections[targets[7] ?? UNUSED_TARGET_SLOT]
	).data

	return useMemo(() => {
		const slots = [slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7]
		return targets
			.slice(0, MAX_RELATIONSHIP_TARGETS)
			.flatMap((collectionSlug, i) =>
				(slots[i] ?? []).map((row) => ({ row, collectionSlug }))
			)
			.filter(({ row }) => row.id !== excludeId)
			.map(({ row, collectionSlug }) => {
				const rowData = row.data as { title?: string; slug?: string }
				return {
					label: rowData.title || rowData.slug || 'Untitled',
					value: row.id,
					slug: rowData.slug ?? '',
					collection: collectionSlug
				}
			})
	}, [
		targets,
		excludeId,
		slot0,
		slot1,
		slot2,
		slot3,
		slot4,
		slot5,
		slot6,
		slot7
	])
}

export function RelationshipField(props: RelationshipFieldProps) {
	return props.hasMany ? (
		<RelationshipFieldMulti {...props} />
	) : (
		<RelationshipFieldSingle {...props} />
	)
}

/** The stored value for one pick, `{relationTo, value}` when polymorphic, a bare id otherwise. */
function storedFor(item: Option, isPolymorphic: boolean): RelationshipStored {
	return isPolymorphic
		? { relationTo: item.collection, value: item.value }
		: item.value
}

/** The full selection handed to `onValueChange` for one pick. */
function selectionFor(item: Option): RelationshipSelection {
	return {
		id: item.value,
		slug: item.slug,
		title: item.label,
		collection: item.collection,
		relationTo: item.collection
	}
}

function RelationshipFieldSingle({
	label,
	description,
	targetType,
	excludeId,
	onValueChange
}: RelationshipFieldProps) {
	const options = useRelationshipOptions(targetType, excludeId)
	const isPolymorphic = Array.isArray(targetType)
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<RelationshipStored | undefined>()

	const selected = useMemo(
		() =>
			value === undefined
				? null
				: (options.find((option) => option.value === valueId(value)) ?? null),
		[options, value]
	)

	return (
		<FieldShell
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<Combobox
				items={options}
				value={selected}
				onValueChange={(item: Option | null) => {
					handleChange(item ? storedFor(item, isPolymorphic) : undefined)
					onValueChange?.(item ? selectionFor(item) : undefined)
				}}
			>
				<ComboboxInput
					id={name}
					name={name}
					placeholder='Search documents…'
					onBlur={handleBlur}
					aria-invalid={isInvalid}
				/>
				<ComboboxContent>
					<ComboboxEmpty>
						{options.length === 0
							? 'No documents exist yet.'
							: 'No matches found.'}
					</ComboboxEmpty>
					<ComboboxList>
						{options.map((option) => (
							<ComboboxItem key={option.value} value={option}>
								{option.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</FieldShell>
	)
}

function RelationshipFieldMulti({
	label,
	description,
	targetType,
	excludeId,
	minRows,
	maxRows
}: RelationshipFieldProps) {
	const options = useRelationshipOptions(targetType, excludeId)
	const isPolymorphic = Array.isArray(targetType)
	const anchor = useComboboxAnchor()
	const [searchValue, setSearchValue] = useState('')
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<RelationshipStored[]>()

	const activeValues = Array.isArray(value) ? value : []
	const selectedOptions = useMemo(
		() =>
			options.filter((option) =>
				activeValues.some((active) => valueId(active) === option.value)
			),
		[options, activeValues]
	)

	// `maxRows` caps new picks UI-side (the schema's own `superRefine`
	// enforces it regardless): at the cap, only already-picked options stay
	// in the picker, so an author can remove but not add.
	const atMax = maxRows !== undefined && activeValues.length >= maxRows
	const pickItems = atMax ? selectedOptions : options

	return (
		<FieldShell
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<div onBlur={handleBlur} className='w-full'>
				<Combobox
					multiple
					items={pickItems}
					value={selectedOptions}
					onValueChange={(items: Option[]) =>
						handleChange(items.map((item) => storedFor(item, isPolymorphic)))
					}
				>
					<ComboboxChips ref={anchor}>
						<ComboboxValue>
							{() => (
								<>
									{selectedOptions.map((option) => (
										<ComboboxChip key={option.value}>
											{option.label}
										</ComboboxChip>
									))}
									<ComboboxChipsInput
										placeholder={
											activeValues.length === 0 ? 'Search documents…' : ''
										}
										value={searchValue}
										onChange={(e) => setSearchValue(e.target.value)}
										id={name}
										name={name}
									/>
								</>
							)}
						</ComboboxValue>
					</ComboboxChips>
					<ComboboxContent anchor={anchor}>
						<ComboboxEmpty>
							{options.length === 0
								? 'No documents exist yet.'
								: 'No matches found.'}
						</ComboboxEmpty>
						<ComboboxList>
							{pickItems.map((option) => (
								<ComboboxItem key={option.value} value={option}>
									{option.label}
								</ComboboxItem>
							))}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
			{minRows !== undefined || maxRows !== undefined ? (
				<p className='text-sm text-muted-foreground'>
					{activeValues.length}
					{maxRows !== undefined ? ` / ${maxRows}` : ''} selected
				</p>
			) : null}
		</FieldShell>
	)
}
