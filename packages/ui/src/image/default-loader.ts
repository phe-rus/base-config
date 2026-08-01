import type { ImageLoader } from './types'

/** No transform: returns `src` unchanged. Works anywhere, zero config; `<Image>` still gets lazy-loading, layout-shift prevention, and the blur-up placeholder without a resizing backend. */
export const defaultLoader: ImageLoader = ({ src }) => src
