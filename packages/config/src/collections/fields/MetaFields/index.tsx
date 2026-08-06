import { useSelector } from '@tanstack/react-store'
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../../../admin/widgets/storage-widget'
import { useKeywordSuggestions } from '../../../db/collections'
import { uploadFile } from '../../../fields/upload'
import { collectionsBySlug } from '../../registry'
import type { CollectionFieldsProps } from '../../types'
import { collectionPath } from '../../types'

export function MetaFields({
	form,
	uploadFolder,
	id
}: Pick<CollectionFieldsProps, 'form'> & {
	/** The owning collection's own `slug`, the share image lands under `meta/<uploadFolder>/<id>` rather than every collection's (and every document's) SEO image colliding in one flat `metadata.image` folder. Doubles as the lookup key into `collectionsBySlug` below, so the preview shows the document's real public path (`collectionPath()`'s own `/<path>/<slug>` shape, e.g. `/post/<slug>`) instead of a bare `/<slug>`. */
	uploadFolder?: string
	/** The document's own id, see `uploadFolder` above. */
	id?: string
}) {
	const store = useSelector(form.store, (s: any) => s.values)
	const { suggestions: keywordSuggestions, onCreate: registerKeyword } =
		useKeywordSuggestions()
	const metaUploadPrefix = ['meta', uploadFolder, id].filter(Boolean).join('/')
	// Widened to a plain-`string`-keyed lookup, same trade-off `Topbar` already
	// makes (`admin/views/topbar.tsx`): `uploadFolder` is a plain `string`
	// here (any registered collection's own slug), not the narrower
	// `CollectionConfig['slug']` union `collectionsBySlug` is declared against.
	const collectionConfig = uploadFolder
		? (
				collectionsBySlug as Record<string, (typeof collectionsBySlug)['pages']>
			)[uploadFolder]
		: undefined
	const previewPath = collectionConfig
		? collectionPath(collectionConfig, store?.slug ?? '')
		: `/${store?.slug ?? ''}`

	return (
		<div className='flex flex-col gap-5'>
			<form.AppField name='metadata.title'>
				{(f: any) => (
					<f.Input
						label='Title'
						placeholder='SEO Title'
						maxLength={60}
						minLength={50}
						description='This should be between 50 and 60 characters. Auto-generation will format a title using the page title. For help in writing quality meta titles, see best practices.'
					/>
				)}
			</form.AppField>
			<form.AppField name='metadata.description'>
				{(f: any) => (
					<f.Textarea
						label='Description'
						placeholder='SEO Description'
						maxLength={160}
						minLength={1}
						description='This should be between 100 and 160 characters. Auto-generation will format a description using the page content. For help in writing quality meta descriptions,'
					/>
				)}
			</form.AppField>
			<form.AppField name='metadata.image'>
				{(f: any) => (
					<f.Upload
						label='Image'
						description='The share image used for SEO/social previews (og:image).'
						accept='image/*'
						onUpload={(file: File) => uploadFile(file, metaUploadPrefix)}
						renderBrowser={(browserProps: StorageWidgetTriggerProps) => (
							<StorageWidget
								{...browserProps}
								defaultFolder={metaUploadPrefix}
								accept='image/*'
							/>
						)}
					/>
				)}
			</form.AppField>
			<form.AppField name='metadata.keywords'>
				{(f: any) => (
					<f.KeywordsInput
						label='Keywords'
						description='Keywords used for SEO purposes'
						suggestions={keywordSuggestions}
						onCreate={registerKeyword}
					/>
				)}
			</form.AppField>

			<section className='flex bg-card rounded-md p-5'>
				{store.metadata?.image?.url && (
					<img
						src={store.metadata.image.url}
						alt={store.metadata?.title}
						className='size-8 object-cover rounded-full'
					/>
				)}
				<div className='flex flex-col ml-5'>
					<span>{previewPath}</span>
					<h2>{store.metadata?.title}</h2>
					<p>{store.metadata?.description}</p>
					<span className='mt-2'>{store.metadata?.keywords?.join(', ')}</span>
				</div>
			</section>
		</div>
	)
}
