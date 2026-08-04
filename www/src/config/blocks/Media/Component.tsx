import type { UploadValue } from '@baseconfig/core'
import type { FC } from 'react'

/** Just the image: the upload value's own `name`/`url`/`size` is all this block stores. */
export const MediaBlock: FC<{ image?: UploadValue }> = ({ image }) => {
	if (!image?.url) return null
	return (
		<img src={image.url} alt={image.name ?? ''} className='w-full rounded-lg' />
	)
}
