import { cn } from '../lib/utils'
import { Skeleton } from '../components/skeleton'
import {
	type ComponentProps,
	useId,
	useLayoutEffect,
	useRef,
	useState
} from 'react'
import { defaultLoader } from './default-loader'
import type { ImageLoader } from './types'

/** Candidate widths used to build `srcSet` when no explicit `width` is given (e.g. `fill` mode) — mirrors `next/image`'s default device-width breakpoints. */
const DEFAULT_WIDTHS = [640, 750, 828, 960, 1080, 1200, 1920, 2048, 3840]

function buildSrcSet(
	loader: ImageLoader,
	src: string,
	width: number | undefined,
	quality: number | undefined
) {
	const widths = width
		? [width, width * 2].filter((w) => w <= 3840)
		: DEFAULT_WIDTHS
	return widths
		.map((w) => `${loader({ quality, src, width: w })} ${w}w`)
		.join(', ')
}

type BaseImageProps = Omit<
	ComponentProps<'img'>,
	'src' | 'placeholder' | 'width' | 'height' | 'loading'
> & {
	/** The image's source path or URL — passed straight to `loader` to build the actual requested URL(s), never rendered as-is unless `loader` is the default passthrough. */
	src: string
	/** Required (same as a plain `<img>`) — not optional here even though `ComponentProps<'img'>` allows it. */
	alt: string
	/** The `sizes` attribute for the underlying `<img>` — tells the browser which candidate width in `srcSet` to actually pick at a given viewport width (e.g. `'(min-width: 768px) 50vw, 100vw'`). Without this, the browser assumes the image is as wide as the viewport, which picks a needlessly large candidate on multi-column layouts. */
	sizes?: string
	/** Forwarded to `loader` as the requested compression quality (0-100, loader-defined scale). Default `75`. */
	quality?: number
	/** Skips lazy-loading and hints the browser to fetch this image first — for above-the-fold images (e.g. a hero image), where lazy-loading would otherwise delay the largest paint on the page. */
	priority?: boolean
	/** Builds the URL requested for a given candidate width — the one pluggable seam that makes this component work with any (or no) image-resizing backend. Defaults to `defaultLoader` (passthrough, `src` unchanged). */
	loader?: ImageLoader
	/** Extra classes for the wrapping element (the actual positioning/overflow container), as opposed to `className`, which lands on the `<img>` itself. */
	wrapperClassName?: string
}

/**
 * `fill` absolutely positions the image to cover its relatively-positioned
 * parent — for when the parent's own layout (a fixed size, an `aspect-*`
 * class, a grid cell) already determines the rendered box. Without `fill`,
 * `width`+`height` are the *other* way to reserve that box: real `<img>`
 * attributes the browser uses to compute intrinsic aspect ratio before the
 * image loads, so nothing jumps when it finishes.
 *
 * Neither is strictly required — `width`/`height` stay optional even when
 * `fill` isn't set, for a plain responsive image whose box is entirely
 * CSS-driven (an `aspect-video` container, for instance — no JS-computed
 * dimensions needed, same as a bare `<img>` would work in that layout).
 * `sizes` (which candidate width in `srcSet` the browser should pick per
 * viewport) is unrelated to this and works the same regardless of which
 * sizing mode is used. The one thing actually disallowed is passing
 * `width`/`height` *together with* `fill: true` — `fill`'s CSS ignores them
 * outright, so keeping them out of that branch's type avoids a
 * pointless-looking call.
 */
type SizeProps =
	| { fill: true; width?: never; height?: never }
	| { fill?: false; width?: number; height?: number }

/** `placeholder: 'blur'` needs a real `blurDataURL` to render — there's no build step here to generate one from `src` automatically (unlike `next/image`'s), so it must be supplied. `'empty'` (the default) shows a skeleton instead and needs nothing extra. */
type PlaceholderProps =
	| { placeholder?: 'empty'; blurDataURL?: never }
	| { placeholder: 'blur'; blurDataURL: string }

export type ImageProps = BaseImageProps & SizeProps & PlaceholderProps

/**
 * Renders an `<img>` with lazy loading, layout-shift prevention, and a
 * loading placeholder, without depending on any particular image-hosting or
 * resizing backend — TanStack Start has no built-in image component the way
 * Next.js does, so this fills that specific gap (worth knowing as prior art,
 * not something this component tries to fully replicate).
 *
 * Concretely: `width`+`height` (or `fill`, for a relatively-positioned
 * parent) reserve the image's box before it loads, so nothing else on the
 * page jumps when it finishes; a `Skeleton` or blurred placeholder fills
 * that box until then; and `srcSet`/`sizes` let the browser request an
 * appropriately-sized candidate per viewport instead of always fetching one
 * fixed size. The one thing this component deliberately does *not* do is
 * pick a resizing backend for you — that's `loader`'s job (see
 * `default-loader.ts`/`cloudflare-loader.ts`).
 */
export function TanstackImage({
	src,
	alt,
	width,
	height,
	fill = false,
	sizes,
	quality = 75,
	priority = false,
	placeholder = 'empty',
	blurDataURL,
	loader = defaultLoader,
	className,
	wrapperClassName,
	style,
	onLoad,
	...props
}: ImageProps) {
	const [loaded, setLoaded] = useState(false)
	const id = useId()
	const imgRef = useRef<HTMLImageElement>(null)

	const resolvedSrc = loader({ width: width ?? 1920, src, quality })
	const srcSet = buildSrcSet(loader, src, width, quality)
	const showPlaceholder = !loaded

	// Runs before paint, so an already-cached image (browser cache, or the
	// same src re-rendered) never flashes the placeholder — `onLoad` alone
	// wouldn't fire again for an image the browser resolves synchronously.
	useLayoutEffect(() => {
		setLoaded(imgRef.current?.complete ?? false)
	}, [resolvedSrc])

	return (
		<picture
			id={'img-' + id}
			className={cn(
				'overflow-hidden prose-img:m-0!',
				fill ? 'absolute inset-0 block h-full w-full' : 'relative block',
				wrapperClassName
			)}
			style={{
				margin: 0
			}}
		>
			{showPlaceholder && placeholder === 'blur' && blurDataURL && (
				<div
					aria-hidden
					className='absolute inset-0 h-full w-full scale-110 bg-cover bg-center blur-xl'
					style={{ backgroundImage: `url(${blurDataURL})` }}
				/>
			)}
			{showPlaceholder && placeholder === 'empty' && (
				<Skeleton className='absolute inset-0 h-full w-full rounded-none' />
			)}
			<img
				{...props}
				ref={imgRef}
				src={resolvedSrc}
				srcSet={srcSet}
				sizes={sizes}
				alt={alt}
				width={fill ? undefined : width}
				height={fill ? undefined : height}
				loading={priority ? 'eager' : 'lazy'}
				fetchPriority={priority ? 'high' : 'auto'}
				decoding='async'
				onLoad={(e) => {
					setLoaded(true)
					onLoad?.(e)
				}}
				style={{ transition: 'opacity 300ms', ...style }}
				className={cn(
					fill
						? 'absolute inset-0 h-full w-full object-cover'
						: 'block h-auto max-w-full',
					showPlaceholder && 'opacity-0',
					className
				)}
			/>
		</picture>
	)
}
