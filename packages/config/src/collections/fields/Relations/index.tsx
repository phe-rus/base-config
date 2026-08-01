import {
	registerKeyword,
	useGlobalKeywordSuggestions
} from '../../../db/collections'
import { RelationshipField } from '../Relationship'

type RelationsFieldProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts`, same reasoning applies here. */
	form: any
	name: string
	excludeId?: string
}

/**
 * A list of "relation groups", each one either a hand-picked set of posts
 * or a keyword filter. Used by both pages and posts: a page uses this to
 * pull in a set of posts to display, a post uses it the same way but can
 * also have several groups, each labeled as its own category.
 *
 * The keyword-filter mode only records the filter criteria for now, actually
 * resolving "which posts currently match" needs documents to be queryable,
 * which isn't true yet (Phase A has no persistence layer, see the plan).
 */
export function RelationsField({ form, name, excludeId }: RelationsFieldProps) {
	return (
		<form.AppField name={name}>
			{(f: any) => (
				<f.ArrayField
					label='Related posts'
					description='Reference posts by hand, or filter by shared keywords.'
				>
					{({ path }: { path: string }) => (
						<RelationGroupFields
							form={form}
							path={path}
							excludeId={excludeId}
						/>
					)}
				</f.ArrayField>
			)}
		</form.AppField>
	)
}

/** One relation group's fields on their own, reused directly by the `relatedPosts` content block (see `blocks/RelatedPosts/index.tsx`), where a block *is* a single group rather than a picker over an array of them. */
export function RelationGroupFields({
	form,
	path,
	excludeId
}: {
	form: any
	path: string
	excludeId?: string
}) {
	const keywordSuggestions = useGlobalKeywordSuggestions()

	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.label`}>
				{(f: any) => (
					<f.Input
						label='Category'
						placeholder='e.g. "Related reading" (optional)'
					/>
				)}
			</form.AppField>
			<form.AppField name={`${path}.mode`}>
				{(f: any) => (
					<>
						<f.RadioGroup
							label='How should posts be chosen?'
							options={[
								{ label: 'Pick specific posts', value: 'manual' },
								{ label: 'Filter by keyword', value: 'keyword' }
							]}
						/>
						{f.state.value === 'keyword' ? (
							<form.AppField name={`${path}.keywords`}>
								{(kf: any) => (
									<kf.KeywordsInput
										label='Keywords'
										description='Posts tagged with any of these keywords will be shown here once documents are persisted.'
										suggestions={keywordSuggestions}
										onCreate={registerKeyword}
									/>
								)}
							</form.AppField>
						) : (
							<form.AppField name={`${path}.ids`}>
								{() => (
									<RelationshipField
										hasMany
										label='Posts'
										targetType='posts'
										excludeId={excludeId}
									/>
								)}
							</form.AppField>
						)}
					</>
				)}
			</form.AppField>
		</div>
	)
}
