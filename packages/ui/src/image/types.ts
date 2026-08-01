export interface ImageLoaderParams {
	src: string
	width: number
	quality?: number
}

/** Builds the URL actually requested for a given rendered width: the pluggable seam that makes `<Image>` work with any (or no) image-resizing backend. */
export type ImageLoader = (params: ImageLoaderParams) => string
