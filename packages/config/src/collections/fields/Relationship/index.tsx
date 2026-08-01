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
import type { CollectionSlug } from '../../types'

/**
 * What a selected relationship actually stores: `id` is the source of
 * truth; `slug`/`title` are a snapshot taken at selection time so a
 * "related posts"-style display can render a link immediately without a
 * live lookup. Trade-off: if the target document is later renamed, the
 * snapshot goes stale until re-selected.
 */
export type RelationshipValue = {
	id: string
	slug: string
	title: string
	/** Which collection this document belongs to, see `collectionPath()` (`../types`) for what this is used for. */
	collection: CollectionSlug
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
	/** Single-select only, called alongside the field's own `handleChange`, e.g. to sync a sibling field (a nav link's `to` derived from the picked document's slug). */
	onValueChange?: (value: RelationshipValue | undefined) => void
}

type Option = {
	label: string
	value: string
	slug: string
	collection: CollectionSlug
}

/**
 * Every real collection's live data, queried once each: React's rules of
 * hooks mean this can't loop over a runtime-length `targetType` list, so
 * adding a new collection means adding one more `useLiveQuery` line here.
 */
function useRelationshipOptions(
	targetType: CollectionSlug | CollectionSlug[] | undefined,
	excludeId: string | undefined
): Option[] {
	const { data: pages } = useLiveQuery(contentCollections.pages)
	const { data: posts } = useLiveQuery(contentCollections.posts)
	const { data: policies } = useLiveQuery(contentCollections.policies)

	return useMemo(() => {
		// `users` is deliberately excluded: real accounts aren't a relatable
		// content type, and (being server-backed, not `localStorage`) aren't
		// queried here at all. See `CollectionConfig['auth']`. A plugin's own
		// collections (e.g. `@baseconfig/plugin-form-builder`'s `forms`) are
		// deliberately *not* wired in here either: this component only knows
		// about the host app's own fixed `CollectionSlug` union (React's
		// rules of hooks rule out looping `useLiveQuery` over a runtime-length
		// list), so a plugin needing its own relationship-style picker builds
		// a small one of its own instead (see `@baseconfig/plugin-form-builder`'s
		// own form-block picker) rather than this file growing a hook per
		// plugin.
		const bySlug: Partial<Record<CollectionSlug, typeof pages>> = {
			pages,
			posts,
			policies
		}
		const targets: CollectionSlug[] = targetType
			? Array.isArray(targetType)
				? targetType
				: [targetType]
			: (Object.keys(bySlug) as CollectionSlug[])

		return targets
			.flatMap((collectionSlug) =>
				(bySlug[collectionSlug] ?? []).map((row) => ({ row, collectionSlug }))
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
	}, [pages, posts, policies, targetType, excludeId])
}

export function RelationshipField(props: RelationshipFieldProps) {
	return props.hasMany ? (
		<RelationshipFieldMulti {...props} />
	) : (
		<RelationshipFieldSingle {...props} />
	)
}

function RelationshipFieldSingle({
	label,
	description,
	targetType,
	excludeId,
	onValueChange
}: RelationshipFieldProps) {
	const options = useRelationshipOptions(targetType, excludeId)
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<RelationshipValue | undefined>()

	const selected = useMemo(
		() => options.find((option) => option.value === value?.id) ?? null,
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
					const next = item
						? {
								id: item.value,
								slug: item.slug,
								title: item.label,
								collection: item.collection
							}
						: undefined
					handleChange(next)
					onValueChange?.(next)
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
	excludeId
}: RelationshipFieldProps) {
	const options = useRelationshipOptions(targetType, excludeId)
	const anchor = useComboboxAnchor()
	const [searchValue, setSearchValue] = useState('')
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<RelationshipValue[]>()

	const activeValues = Array.isArray(value) ? value : []
	const selectedOptions = useMemo(
		() =>
			options.filter((option) =>
				activeValues.some((active) => active.id === option.value)
			),
		[options, activeValues]
	)

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
					items={options}
					value={selectedOptions}
					onValueChange={(items: Option[]) =>
						handleChange(
							items.map((item) => ({
								id: item.value,
								slug: item.slug,
								title: item.label,
								collection: item.collection
							}))
						)
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
							{options.map((option) => (
								<ComboboxItem key={option.value} value={option}>
									{option.label}
								</ComboboxItem>
							))}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
		</FieldShell>
	)
}
