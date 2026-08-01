import type { ImageLoader } from './types'

/**
 * Optional loader for Cloudflare's built-in Image Resizing (`/cdn-cgi/image/...`),
 * zero server code needed, since `www` already deploys as a Cloudflare
 * Worker (same "platform-native, no invented magic, no extra vendor
 * lock-in" precedent as `@pherus/stack`'s `StackRoom`). Never used by
 * default; opt in with `<Image loader={cloudflareLoader} .../>`. `src`
 * must be an absolute URL or a path Cloudflare can resolve against the
 * current zone (relative paths work when the image is served from the
 * same zone as the Worker).
 */
export const cloudflareLoader: ImageLoader = ({ src, width, quality = 75 }) =>
	`/cdn-cgi/image/width=${width},quality=${quality},format=auto/${src.replace(/^\/+/, '')}`
